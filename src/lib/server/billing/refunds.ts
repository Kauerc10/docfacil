import "server-only";
import crypto from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore, getAdminAuth } from "../firebase-admin";
import { BackendError } from "../errors";
import type { OrderRecord } from "../domain/documents";
import { authorizePurchaseRequest } from "./purchase-authorization";
import type { Principal } from "../security";
import type { MercadoPagoPayment, MercadoPagoRefund } from "./mercadopago/types";

const AVULSO_CENTS = 1990;

export interface RefundProvider {
  refundPayment(paymentId: string, idempotencyKey: string): Promise<MercadoPagoRefund>;
  getPayment(paymentId: string): Promise<MercadoPagoPayment>;
}

export interface RefundRequestRecord { id: string; orderId: string; reason: string; status: "requested" | "processing" | "confirmed" | "failed" | "partial"; createdAt: number; updatedAt: number; reviewedBy?: string; confirmedAmountCents?: number; leaseOwner?: string; leaseUntil?: number; }

function requestRef(db: Firestore, id: string) { return db.collection("billing_refund_requests").doc(id); }
function operationRef(db: Firestore, id: string) { return db.collection("billing_financial_operations").doc(id); }

export async function requestAvulsoRefund(input: { req: Request; order: OrderRecord; principal: Principal; reason: string; db?: Firestore }): Promise<RefundRequestRecord> {
  const db = input.db ?? getAdminFirestore();
  if (!await authorizePurchaseRequest(input.req, input.order, input.principal)) throw new BackendError("ORDER_FORBIDDEN", 403, "Você não tem permissão para esta compra.");
  const allowedAmounts = [AVULSO_CENTS, 3990, 2990];
  if (input.order.provider !== "mercadopago" || !allowedAmounts.includes(input.order.amountCents)) throw new BackendError("INVALID_REQUEST", 409, "Reembolso disponível apenas para compras do Mercado Pago.");
  if (!input.order.id) throw new BackendError("INVALID_REQUEST", 400, "Pedido inválido.");
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 500) throw new BackendError("INVALID_REQUEST", 400, "Motivo de reembolso inválido.");
  const id = `manual:${input.order.id}`;
  const now = Date.now();
  return db.runTransaction(async (tx) => {
    const ref = requestRef(db, id);
    const snap = await tx.get(ref);
    if (snap.exists) return snap.data() as RefundRequestRecord;
    const record: RefundRequestRecord = { id, orderId: input.order.id!, reason, status: "requested", createdAt: now, updatedAt: now };
    tx.create(ref, record);
    return record;
  });
}

export async function getRefundRequest(orderId: string, db = getAdminFirestore()): Promise<RefundRequestRecord | null> {
  const snap = await requestRef(db, `manual:${orderId}`).get();
  return snap.exists ? snap.data() as RefundRequestRecord : null;
}

export async function requireBillingAdmin(req: Request): Promise<{ uid: string }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new BackendError("INVALID_AUTH_TOKEN", 401, "Autenticação obrigatória.");
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if ((decoded as unknown as { admin?: unknown }).admin !== true) throw new Error("not admin");
    return { uid: decoded.uid };
  } catch {
    throw new BackendError("ORDER_FORBIDDEN", 403, "Permissão administrativa obrigatória.");
  }
}

function fullyRefunded(payment: MercadoPagoPayment, expectedCents: number): boolean {
  if (String(payment.status ?? "").toLowerCase() === "refunded") return true;
  const refunds = Array.isArray(payment.refunds) ? payment.refunds as Array<Record<string, unknown>> : [];
  const amount = refunds.filter((refund) => String(refund.status ?? "").toLowerCase() === "approved").reduce((sum, refund) => sum + Math.round(Number(refund.amount ?? 0) * 100), 0);
  return amount >= expectedCents;
}

export async function executeAvulsoRefund(input: { order: OrderRecord; request: RefundRequestRecord; reviewerId: string; confirmedAmountCents: number; provider: RefundProvider; db?: Firestore; now?: number }): Promise<RefundRequestRecord> {
  const db = input.db ?? getAdminFirestore();
  const now = input.now ?? Date.now();
  const expectedCents = input.order.amountCents;
  if (input.order.id !== input.request.orderId || input.order.provider !== "mercadopago" || !["paid", "reserved", "consumed"].includes(input.order.status) || input.order.providerPaymentId === undefined) throw new BackendError("INVALID_REQUEST", 409, "Cobrança integral não disponível para este pedido.");
  if (input.confirmedAmountCents !== expectedCents || !input.reviewerId) throw new BackendError("INVALID_REQUEST", 400, "Valor de reembolso inválido.");
  const operationId = `manual-refund:${input.order.id}`;
  const opRef = operationRef(db, operationId);
  const owner = crypto.randomUUID();
  const leaseUntil = now + 2 * 60_000;
  const claimed = await db.runTransaction(async (tx) => {
    const request = await tx.get(requestRef(db, input.request.id));
    const operation = await tx.get(opRef);
    const order = await tx.get(db.collection("orders").doc(input.order.id!));
    if (!request.exists) throw new BackendError("ORDER_NOT_FOUND", 404, "Solicitação não encontrada.");
    if (!order.exists || order.get("provider") !== "mercadopago" || order.get("providerPaymentId") !== input.order.providerPaymentId) throw new BackendError("CONFLICT", 409, "Pedido e cobrança não conferem.");
    if (request.get("status") === "confirmed") return false;
    if (request.get("status") === "processing" && Number(request.get("leaseUntil") ?? 0) > now) return false;
    const updates = { status: "processing", leaseOwner: owner, leaseUntil, reviewedBy: input.reviewerId, confirmedAmountCents: expectedCents, updatedAt: now };
    tx.set(requestRef(db, input.request.id), updates, { merge: true });
    if (operation.exists) tx.set(opRef, { ...updates, id: operationId, type: "manual_refund", orderId: input.order.id, paymentId: input.order.providerPaymentId, idempotencyKey: `manual-refund:${input.order.id}` }, { merge: true });
    else tx.create(opRef, { ...updates, id: operationId, type: "manual_refund", orderId: input.order.id, paymentId: input.order.providerPaymentId, idempotencyKey: `manual-refund:${input.order.id}`, createdAt: now });
    return true;
  });
  if (!claimed) return (await getRefundRequest(input.order.id!, db))!;
  try {
    let payment = await input.provider.getPayment(input.order.providerPaymentId);
    if (String(payment.id) !== String(input.order.providerPaymentId) || payment.currency_id !== "BRL" || Math.round(Number(payment.transaction_amount ?? 0) * 100) !== expectedCents) throw new BackendError("CONFLICT", 409, "Cobrança consultada não corresponde ao pedido.");
    if (!fullyRefunded(payment, expectedCents)) {
      await input.provider.refundPayment(input.order.providerPaymentId, `manual-refund:${input.order.id}`);
      payment = await input.provider.getPayment(input.order.providerPaymentId);
    }
    const refundedCents = Array.isArray(payment.refunds) ? (payment.refunds as Array<Record<string, unknown>>).filter((refund) => String(refund.status ?? "").toLowerCase() === "approved").reduce((sum, refund) => sum + Math.round(Number(refund.amount ?? 0) * 100), 0) : (String(payment.status ?? "").toLowerCase() === "refunded" ? expectedCents : 0);
    const status: RefundRequestRecord["status"] = fullyRefunded(payment, expectedCents) ? "confirmed" : refundedCents > 0 ? "partial" : "processing";
    await db.runTransaction(async (tx) => {
      const requestSnap = await tx.get(requestRef(db, input.request.id));
      if (!requestSnap.exists || requestSnap.get("leaseOwner") !== owner) return;
      tx.set(requestRef(db, input.request.id), { status, confirmedAmountCents: refundedCents, leaseOwner: null, leaseUntil: null, updatedAt: now }, { merge: true });
      tx.set(opRef, { status, confirmedAmountCents: refundedCents, leaseOwner: null, leaseUntil: null, updatedAt: now }, { merge: true });
      if (status === "confirmed") {
        tx.update(db.collection("orders").doc(input.order.id!), { status: "refunded", updatedAt: now });
        if (input.order.product === "pro" && input.order.buyer.type === "user") {
          const subRef = db.collection("billing_subscriptions").doc(input.order.buyer.userId);
          const subSnap = await tx.get(subRef);
          if (subSnap.exists) {
            const currentSub = subSnap.data() as { paidThrough?: number; status?: string };
            const currentPaidThrough = Number(currentSub.paidThrough ?? 0);
            const newPaidThrough = Math.max(0, currentPaidThrough - 30 * 86400000);
            tx.update(subRef, {
              paidThrough: newPaidThrough,
              status: newPaidThrough <= now ? "cancelled" : (currentSub.status ?? "active"),
              autoRenew: newPaidThrough <= now ? false : undefined,
              updatedAt: now,
            });
          }
        }
      }
    });
    return (await getRefundRequest(input.order.id!, db))!;
  } catch {
    await db.runTransaction(async (tx) => {
      const request = await tx.get(requestRef(db, input.request.id));
      if (request.exists && request.get("leaseOwner") === owner) {
        tx.set(requestRef(db, input.request.id), { status: "failed", leaseOwner: null, leaseUntil: null, updatedAt: now }, { merge: true });
        tx.set(opRef, { status: "failed", leaseOwner: null, leaseUntil: null, updatedAt: now }, { merge: true });
      }
    });
    throw new BackendError("BILLING_PROVIDER_FAILED", 502, "Não foi possível confirmar o reembolso.");
  }
}
