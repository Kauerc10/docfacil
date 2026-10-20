import "server-only";
import crypto from "node:crypto";
import type { Firestore, DocumentReference } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../firebase-admin";
import { BackendError } from "../../errors";
import type { OrderRecord } from "../../domain/documents";
import type { MercadoPagoPayment, MercadoPagoRefund } from "./types";

const AVULSO_CENTS = 1990;
const MAX_ATTEMPTS = 3;
const LEASE_MS = 2 * 60_000;

export interface FinancialProvider {
  refundPayment(paymentId: string, idempotencyKey: string): Promise<MercadoPagoRefund>;
  getPayment(paymentId: string): Promise<MercadoPagoPayment>;
}

export interface ApplyAvulsoResult { primary: boolean; applied: boolean; }

function orderRef(db: Firestore, id: string) { return db.collection("orders").doc(id); }
function ledgerRef(db: Firestore, id: string) { return db.collection("billing_payment_ledger").doc(id); }
function operationRef(db: Firestore, id: string) { return db.collection("billing_financial_operations").doc(id); }

async function updateOwnedOperation(db: Firestore, ref: DocumentReference, owner: string, updates: Record<string, unknown>): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("leaseOwner") !== owner) return false;
    tx.update(ref, updates);
    return true;
  });
}

export async function applyAvulsoPayment(orderId: string, paymentId: string, paidAt: number, db = getAdminFirestore()): Promise<ApplyAvulsoResult> {
  if (!orderId || !paymentId || !Number.isFinite(paidAt)) throw new BackendError("INVALID_REQUEST", 400, "Pagamento inválido.");
  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef(db, orderId));
    if (!orderSnap.exists) throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido não encontrado.");
    const order = { ...orderSnap.data(), id: orderSnap.id } as OrderRecord;
    if (order.provider !== "mercadopago" || order.product !== "avulso" || order.amountCents !== AVULSO_CENTS) {
      throw new BackendError("INVALID_REQUEST", 409, "Pedido incompatível com pagamento avulso.");
    }
    const paymentLedger = ledgerRef(db, paymentId);
    const existingLedger = await tx.get(paymentLedger);
    if (existingLedger.exists) {
      const previous = existingLedger.data() as { orderId?: string; primary?: boolean; applied?: boolean };
      if (previous.orderId !== orderId) throw new BackendError("CONFLICT", 409, "Pagamento já vinculado a outro pedido.");
      return { primary: Boolean(previous.primary), applied: false };
    }
    // A pending PIX identifier is only a reservation. The first approved
    // payment can replace it. A legacy order already carrying this payment
    // remains primary, but its effect is deliberately not replayed.
    const samePrimary = order.providerPaymentId === paymentId;
    const primary = samePrimary || order.status === "pending" ||
      (!order.providerPaymentId && ["paid", "reserved", "consumed"].includes(order.status));
    const applied = primary && order.status === "pending";
    const now = Date.now();
    tx.create(paymentLedger, { paymentId, orderId, primary, applied, paidAt, createdAt: now });
    if (applied) {
      tx.update(orderRef(db, orderId), { providerPaymentId: paymentId, providerStatus: "approved", status: "paid", paidAt });
    } else if (primary && !order.providerPaymentId) {
      tx.update(orderRef(db, orderId), { providerPaymentId: paymentId, providerStatus: "approved" });
    } else if (!samePrimary && Boolean(order.providerPaymentId)) {
      const operationId = `${orderId}:refund:${paymentId}`;
      tx.create(operationRef(db, operationId), {
        id: operationId, type: "duplicate_payment_refund", orderId, paymentId,
        status: "pending", attempts: 0, nextAttemptAt: now, createdAt: now, updatedAt: now,
        idempotencyKey: `refund:${orderId}:${paymentId}`,
      });
    }
    return { primary, applied };
  });
}

function isFullyRefunded(payment: MercadoPagoPayment, amountCents: number): boolean {
  if (String(payment.status ?? "").toLowerCase() === "refunded") return true;
  const refunds = Array.isArray(payment.refunds) ? payment.refunds as Array<Record<string, unknown>> : [];
  const total = refunds.filter((item) => String(item.status ?? "").toLowerCase() === "approved").reduce((sum, item) => sum + Math.round(Number(item.amount ?? 0) * 100), 0);
  return total >= amountCents;
}

export async function processDuplicateRefunds(input: { provider: FinancialProvider; db?: Firestore; now?: number; limit?: number }): Promise<{ confirmed: number; failed: number; pending: number }> {
  const db = input.db ?? getAdminFirestore();
  const now = input.now ?? Date.now();
  const snap = await db.collection("billing_financial_operations").where("type", "==", "duplicate_payment_refund").where("status", "in", ["pending", "processing"]).limit(Math.max(input.limit ?? 10, 25)).get();
  const result = { confirmed: 0, failed: 0, pending: 0 };
  for (const doc of snap.docs.filter((item) => ["pending", "processing"].includes(String(item.get("status"))) && Number(item.get("attempts") ?? 0) < MAX_ATTEMPTS && (Number(item.get("nextAttemptAt") ?? 0) <= now || Number(item.get("leaseUntil") ?? 0) <= now)).slice(0, input.limit ?? 10)) {
    const ref = doc.ref;
    const owner = crypto.randomBytes(12).toString("hex");
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (!fresh.exists) return false;
      const op = fresh.data() as Record<string, unknown>;
      if (!["pending", "processing"].includes(String(op.status)) || Number(op.attempts ?? 0) >= MAX_ATTEMPTS || (op.status === "processing" && Number(op.leaseUntil ?? 0) > now) || Number(op.nextAttemptAt ?? 0) > now) return false;
      tx.update(ref, { status: "processing", attempts: Number(op.attempts ?? 0) + 1, leaseOwner: owner, leaseUntil: now + LEASE_MS, updatedAt: now });
      return true;
    });
    if (!claimed) continue;
    const op = (await ref.get()).data() as { paymentId: string; orderId: string; idempotencyKey: string; attempts: number };
    try {
      await input.provider.refundPayment(op.paymentId, op.idempotencyKey);
      const payment = await input.provider.getPayment(op.paymentId);
      if (!isFullyRefunded(payment, AVULSO_CENTS)) {
        const terminal = op.attempts >= MAX_ATTEMPTS;
        const saved = await updateOwnedOperation(db, ref, owner, { status: terminal ? "failed" : "pending", nextAttemptAt: now + 5 * 60_000, leaseOwner: null, leaseUntil: null, lastErrorCode: "REFUND_NOT_CONFIRMED", updatedAt: now });
        if (saved && terminal) await db.collection("billing_occurrences").doc(`${doc.id}:refund`).set({ type: "duplicate_payment_refund", operationId: doc.id, orderId: op.orderId, paymentId: op.paymentId, status: "open", createdAt: now, updatedAt: now }, { merge: true });
        if (saved && terminal) result.failed++; else if (saved) result.pending++;
        continue;
      }
      if (await updateOwnedOperation(db, ref, owner, { status: "confirmed", confirmedAt: now, leaseOwner: null, leaseUntil: null, updatedAt: now })) result.confirmed++;
    } catch {
      const attempts = op.attempts;
      const terminal = attempts >= MAX_ATTEMPTS;
      const saved = await updateOwnedOperation(db, ref, owner, { status: terminal ? "failed" : "pending", nextAttemptAt: now + attempts * 5 * 60_000, leaseOwner: null, leaseUntil: null, lastErrorCode: "REFUND_FAILED", updatedAt: now });
      if (saved && terminal) {
        await db.collection("billing_occurrences").doc(`${doc.id}:refund`).set({ type: "duplicate_payment_refund", operationId: doc.id, orderId: op.orderId, paymentId: op.paymentId, status: "open", createdAt: now, updatedAt: now }, { merge: true });
        result.failed++;
      } else if (saved) result.pending++;
    }
  }
  return result;
}
