import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";
import { BackendError } from "../errors";
import type { OrderRecord } from "../domain/documents";

export interface BillingDisputeRecord {
  id: string;
  orderId: string;
  paymentId: string;
  amountCents: number;
  product: "avulso" | "pro";
  status: "opened" | "resolved_won" | "resolved_lost";
  reason: string;
  openedAt: number;
  resolvedAt?: number;
  documentId?: string;
  userId?: string;
}

function disputeRef(db: Firestore, id: string) {
  return db.collection("billing_disputes").doc(id);
}

function occurrenceRef(db: Firestore, id: string) {
  return db.collection("billing_occurrences").doc(id);
}

export async function openPaymentDispute(input: {
  paymentId: string;
  reason: string;
  now?: number;
  db?: Firestore;
}): Promise<BillingDisputeRecord> {
  const db = input.db ?? getAdminFirestore();
  const now = input.now ?? Date.now();
  const id = `dispute:${input.paymentId}`;

  return db.runTransaction(async (tx) => {
    const ref = disputeRef(db, id);
    const existing = await tx.get(ref);
    if (existing.exists) return existing.data() as BillingDisputeRecord;

    // Localiza o pedido com esse providerPaymentId
    const orderQuery = await db.collection("orders").where("providerPaymentId", "==", input.paymentId).limit(1).get();
    if (orderQuery.empty) {
      throw new BackendError("ORDER_NOT_FOUND", 404, "Cobrança contestada não encontrada.");
    }

    const orderDoc = orderQuery.docs[0];
    const order = { ...orderDoc.data(), id: orderDoc.id } as OrderRecord;

    const record: BillingDisputeRecord = {
      id,
      orderId: order.id!,
      paymentId: input.paymentId,
      amountCents: order.amountCents,
      product: order.product,
      status: "opened",
      reason: input.reason,
      openedAt: now,
      documentId: order.documentId,
      userId: order.buyer.type === "user" ? order.buyer.userId : undefined,
    };

    tx.set(ref, record);

    // Suspende novas gerações/edições do documento específico, sem apagar downloads
    if (order.documentId) {
      const docRef = db.collection("documents").doc(order.documentId);
      tx.update(docRef, { disputeActive: true, updatedAt: now });
    }

    // Registra ocorrência na fila de atendimento
    const occurrenceId = `occurrence:dispute:${input.paymentId}`;
    tx.set(occurrenceRef(db, occurrenceId), {
      id: occurrenceId,
      type: "dispute",
      orderId: order.id,
      paymentId: input.paymentId,
      reason: input.reason,
      status: "pending_review",
      createdAt: now,
    });

    return record;
  });
}

export async function resolvePaymentDispute(input: {
  paymentId: string;
  outcome: "won" | "lost";
  now?: number;
  db?: Firestore;
}): Promise<BillingDisputeRecord> {
  const db = input.db ?? getAdminFirestore();
  const now = input.now ?? Date.now();
  const id = `dispute:${input.paymentId}`;

  return db.runTransaction(async (tx) => {
    const ref = disputeRef(db, id);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new BackendError("NOT_FOUND" as never, 404, "Contestação não encontrada.");
    }

    const current = snap.data() as BillingDisputeRecord;
    if (current.status !== "opened") return current;

    const finalStatus = input.outcome === "won" ? "resolved_won" : "resolved_lost";
    const updated: BillingDisputeRecord = {
      ...current,
      status: finalStatus,
      resolvedAt: now,
    };

    tx.update(ref, { status: finalStatus, resolvedAt: now });

    // Se vencemos a disputa, restaura os direitos cabíveis do documento
    if (input.outcome === "won" && current.documentId) {
      const docRef = db.collection("documents").doc(current.documentId);
      tx.update(docRef, { disputeActive: false, updatedAt: now });
    }

    return updated;
  });
}
