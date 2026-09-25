import "server-only";
import { createHash } from "crypto";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import { BackendError } from "@/lib/server/errors";
import type { AIDocumentSession } from "@/lib/ai/types";

const DAY = 86_400_000;
const TTL = 30 * DAY;
const sessions = () => getAdminFirestore().collection("ai_sessions");

export function assertPilotUser(userId: string): void {
  const allowed = (process.env.AI_PILOT_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!process.env.GROQ_API_KEY || process.env.AI_PILOT_EVALUATED !== "true" || process.env.AI_GROQ_ZDR_CONFIRMED !== "true" || !allowed.includes(userId)) {
    throw new BackendError("DOCUMENT_FORBIDDEN", 403, "O piloto de IA não está disponível para esta conta.");
  }
}

function localDay(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function sessionIdFromOperation(userId: string, operationId: string): string {
  const hex = createHash("sha256").update(`${userId}:${operationId}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function createSession(userId: string, operationId: string, request: string): Promise<AIDocumentSession> {
  const id = sessionIdFromOperation(userId, operationId);
  const ref = sessions().doc(id);
  const quotaRef = getAdminFirestore().collection("ai_usage").doc(`${userId}_${localDay()}`);
  return getAdminFirestore().runTransaction(async (tx) => {
    const [existing, quota] = await Promise.all([tx.get(ref), tx.get(quotaRef)]);
    if (existing.exists) {
      const session = existing.data() as AIDocumentSession;
      if (session.ownerId !== userId || session.request !== request) throw new BackendError("CONFLICT", 409, "Identificador de operação reutilizado.");
      return session;
    }
    if ((quota.data()?.sessions ?? 0) >= 3) throw new BackendError("FREE_LIMIT_REACHED", 429, "Limite diário de três sessões atingido.");
    const now = Date.now();
    const session: AIDocumentSession = {
      id, ownerId: userId, request, status: "classifying", version: 1,
      questions: [], answers: {}, references: [], warnings: [], revisions: 0, llmCalls: 0,
      createdAt: now, updatedAt: now, expiresAt: now + TTL,
    };
    tx.create(ref, session);
    tx.set(quotaRef, { sessions: (quota.data()?.sessions ?? 0) + 1, updatedAt: now }, { merge: true });
    return session;
  });
}

export async function getSession(id: string, userId: string): Promise<AIDocumentSession> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new BackendError("INVALID_REQUEST", 400, "Sessão inválida.");
  const snap = await sessions().doc(id).get();
  const session = snap.data() as AIDocumentSession | undefined;
  if (!session || session.ownerId !== userId || session.expiresAt <= Date.now()) {
    throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Sessão não encontrada.");
  }
  return session;
}

export async function listSessions(userId: string): Promise<AIDocumentSession[]> {
  const snap = await sessions().where("ownerId", "==", userId).get();
  return snap.docs.map((doc) => doc.data() as AIDocumentSession)
    .filter((session) => session.expiresAt > Date.now())
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateSession(
  id: string, userId: string, expectedVersion: number, operationId: string,
  change: (session: AIDocumentSession) => AIDocumentSession
): Promise<AIDocumentSession> {
  return getAdminFirestore().runTransaction(async (tx) => {
    const ref = sessions().doc(id);
    const snap = await tx.get(ref);
    const original = snap.data() as AIDocumentSession | undefined;
    if (!original || original.ownerId !== userId || original.expiresAt <= Date.now()) throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Sessão não encontrada.");
    if (original.lastOperationId === operationId) return original;
    if (original.version !== expectedVersion) throw new BackendError("CONFLICT", 409, "Esta sessão mudou em outra aba. Recarregue antes de editar.");
    const now = Date.now();
    const updated = { ...change(original), id, ownerId: userId, version: original.version + 1, updatedAt: now, expiresAt: now + TTL, lastOperationId: operationId };
    tx.set(ref, updated);
    return updated;
  });
}

export async function reserveLLMCall(id: string, userId: string): Promise<void> {
  const globalRef = getAdminFirestore().collection("ai_usage_global").doc(localDay());
  const ref = sessions().doc(id);
  await getAdminFirestore().runTransaction(async (tx) => {
    const [sessionSnap, globalSnap] = await Promise.all([tx.get(ref), tx.get(globalRef)]);
    const session = sessionSnap.data() as AIDocumentSession | undefined;
    if (!session || session.ownerId !== userId) throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Sessão não encontrada.");
    if (session.llmCalls >= 20 || (globalSnap.data()?.llmCalls ?? 0) >= 60) throw new BackendError("FREE_LIMIT_REACHED", 429, "Limite gratuito de IA atingido. Retome mais tarde.");
    tx.update(ref, { llmCalls: session.llmCalls + 1 });
    tx.set(globalRef, { llmCalls: (globalSnap.data()?.llmCalls ?? 0) + 1 }, { merge: true });
  });
}

export async function deleteSession(id: string, userId: string): Promise<void> {
  await getSession(id, userId);
  await getAdminFirestore().recursiveDelete(sessions().doc(id));
}

export async function purgeExpiredSessions(): Promise<number> {
  const snap = await sessions().where("expiresAt", "<=", Date.now()).limit(50).get();
  for (const doc of snap.docs) await getAdminFirestore().recursiveDelete(doc.ref);
  return snap.size;
}
