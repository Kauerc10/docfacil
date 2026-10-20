import "server-only";
import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore, getAdminAuth } from "../firebase-admin";
import { BackendError } from "../errors";
import type { Principal } from "../security";
import type { DocumentRecord } from "../domain/documents";

export interface IdentityCorrectionRecord {
  id: string;
  documentId: string;
  orderId?: string;
  requesterEmail: string;
  maskedCurrentId: string;
  requestedId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  decisionNotes?: string;
}

function maskIdentifier(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length <= 4) return "***";
  return digits.slice(0, 3) + ".***.***-" + digits.slice(-2);
}

export function hashIdentifier(id: string): string {
  return createHash("sha256").update(id.trim().replace(/\D/g, "")).digest("hex");
}

function correctionRef(db: Firestore, id: string) {
  return db.collection("billing_identity_corrections").doc(id);
}

export async function requestIdentityCorrection(input: {
  documentId: string;
  requestedId: string;
  reason: string;
  principal: Principal;
  db?: Firestore;
}): Promise<IdentityCorrectionRecord> {
  const db = input.db ?? getAdminFirestore();
  const docRef = db.collection("documents").doc(input.documentId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Documento não encontrado.");

  const doc = docSnap.data() as DocumentRecord;
  if (doc.status === "deleted") throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Documento indisponível.");

  // Validação de posse do documento
  if (input.principal.type === "user") {
    if (doc.owner.type !== "user" || doc.owner.userId !== input.principal.userId) {
      throw new BackendError("ORDER_FORBIDDEN", 403, "Você não tem permissão para este documento.");
    }
  }

  const requestedClean = input.requestedId.trim();
  const digits = requestedClean.replace(/\D/g, "");
  if (digits.length !== 11 && digits.length !== 14) {
    throw new BackendError("INVALID_REQUEST", 400, "Identificador inválido (CPF ou CNPJ).");
  }

  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 500) {
    throw new BackendError("INVALID_REQUEST", 400, "Descreva o motivo da correção (5 a 500 caracteres).");
  }

  const id = `correction:${input.documentId}`;
  const now = Date.now();
  const requesterEmail = (input.principal.type === "user"
    ? input.principal.email
    : (doc.owner.type === "guest" ? doc.owner.contact.email : "")) ?? "";

  // Localiza o CPF atual nas respostas se existir
  const currentRawId = Object.entries(doc.respostas ?? {}).find(([k]) => k.includes("cpf") || k.includes("cnpj"))?.[1] ?? "";

  const record: IdentityCorrectionRecord = {
    id,
    documentId: input.documentId,
    orderId: doc.entitlement?.orderId,
    requesterEmail,
    maskedCurrentId: maskIdentifier(currentRawId),
    requestedId: requestedClean,
    reason,
    status: "pending",
    createdAt: now,
  };

  await correctionRef(db, id).set(record);
  return record;
}

export async function requireSupportOrAdmin(req: Request): Promise<{ uid: string; role: "support" | "admin" }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new BackendError("INVALID_AUTH_TOKEN", 401, "Autenticação obrigatória.");
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const claims = decoded as unknown as { admin?: boolean; support?: boolean };
    if (claims.admin === true) return { uid: decoded.uid, role: "admin" };
    if (claims.support === true) return { uid: decoded.uid, role: "support" };
    throw new Error("unauthorized");
  } catch {
    throw new BackendError("ORDER_FORBIDDEN", 403, "Permissão de suporte ou administração obrigatória.");
  }
}

export async function reviewIdentityCorrection(input: {
  correctionId: string;
  decision: "approved" | "rejected";
  reviewerId: string;
  decisionNotes?: string;
  db?: Firestore;
}): Promise<IdentityCorrectionRecord> {
  const db = input.db ?? getAdminFirestore();
  const ref = correctionRef(db, input.correctionId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Solicitação não encontrada.");
    const current = snap.data() as IdentityCorrectionRecord;
    if (current.status !== "pending") {
      throw new BackendError("CONFLICT", 409, "Esta solicitação já foi revisada.");
    }

    const updated: IdentityCorrectionRecord = {
      ...current,
      status: input.decision,
      reviewedBy: input.reviewerId,
      reviewedAt: Date.now(),
      decisionNotes: input.decisionNotes?.trim(),
    };

    tx.update(ref, {
      status: input.decision,
      reviewedBy: input.reviewerId,
      reviewedAt: updated.reviewedAt,
      decisionNotes: updated.decisionNotes,
    });

    return updated;
  });
}
