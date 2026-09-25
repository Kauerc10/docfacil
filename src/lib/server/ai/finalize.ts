import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import type { Modelo } from "@/lib/types";
import { aiDraftSchema, validateDraft, type AIDocumentSession } from "@/lib/ai/types";
import { calculateModelSnapshotHash, calculateSourceHash } from "@/lib/server/domain/documents";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import { getDocumentStore } from "@/lib/server/firestore/document-store";
import { getArtifactStorage } from "@/lib/server/r2/storage";
import { generatePdfServer } from "@/lib/pdf/server";
import { BackendError } from "@/lib/server/errors";
import { getSession } from "./session-store";

export function syntheticModel(session: AIDocumentSession): Modelo {
  const draft = aiDraftSchema.parse(session.draft);
  return {
    slug: `ai-${session.id}`, nome: draft.title, desc: session.request.slice(0, 200), quandoUsar: "Documento criado com IA",
    categoria: "Pessoal", minutos: 0, icone: "seal", campos: [],
    template: { titulo: draft.title, corpo: draft.sections.flatMap((section) => [section.title.toUpperCase(), ...section.paragraphs, ""]) },
  };
}

export async function finalizeAISession(sessionId: string, userId: string, requestId: string, expectedVersion: number): Promise<{ documentId: string; version: number }> {
  const sessionRef = getAdminFirestore().collection("ai_sessions").doc(sessionId);
  const session = await getAdminFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(sessionRef);
    const item = snap.data() as AIDocumentSession | undefined;
    if (!item || item.ownerId !== userId || item.expiresAt <= Date.now()) throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Sessão não encontrada.");
    if (item.status === "completed" && item.documentId) return item;
    if (item.version !== expectedVersion) throw new BackendError("CONFLICT", 409, "O rascunho mudou em outra aba.");
    if (item.status !== "approved" || item.approvedVersion !== item.version || !item.draft || validateDraft(item.draft, item.references, item.answers).length) {
      throw new BackendError("INVALID_REQUEST", 400, "O rascunho precisa de validação e aprovação atualizadas.");
    }
    if (item.finalizingRequestId && item.finalizingRequestId !== requestId && (item.finalizingAt ?? 0) > Date.now() - 600_000) {
      throw new BackendError("GENERATION_IN_PROGRESS", 409, "O PDF já está sendo gerado.");
    }
    tx.update(sessionRef, { finalizingRequestId: requestId, finalizingAt: Date.now() });
    return item;
  });
  if (session.status === "completed" && session.documentId) return { documentId: session.documentId, version: 1 };

  const store = getDocumentStore();
  const { request, isNew } = await store.getOrCreateGenerationRequest(requestId, {
    operation: "initial", principalKey: `user:${userId}`, documentId: "pending", targetVersion: 1,
  });
  if (!isNew) {
    if (request.principalKey !== `user:${userId}`) throw new BackendError("DOCUMENT_FORBIDDEN", 403, "Solicitação inválida.");
    if (request.status === "completed") {
      await sessionRef.update({ status: "completed", documentId: request.documentId, finalizingRequestId: FieldValue.delete(), finalizingAt: FieldValue.delete() });
      return { documentId: request.documentId, version: 1 };
    }
    throw new BackendError("GENERATION_IN_PROGRESS", 409, "Esta geração já foi iniciada.");
  }

  let documentId: string | undefined;
  let objectKey: string | undefined;
  let committed = false;
  try {
    const model = syntheticModel(session);
    const answers = { ai_content: JSON.stringify(session.draft) };
    const pdf = await generatePdfServer(model, {}, { watermark: false });
    if (pdf.byteLength > 3 * 1024 * 1024) throw new BackendError("GENERATION_FAILED", 413, "O PDF excede o tamanho permitido.");
    const now = Date.now();
    const doc = await store.createDocument({
      owner: { type: "user", userId }, modeloSlug: model.slug, modeloNome: model.nome,
      source: "ai", aiSessionId: session.id,
      aiSnapshot: { title: session.draft!.title, sections: session.draft!.sections,
        references: session.references.map(({ id, source, version }) => ({ id, source, version })) },
      respostas: answers, entitlement: { type: "ai_beta", watermarked: false },
      artifactState: "generating", currentVersion: null, targetVersion: 1, createdAt: now, updatedAt: now,
    });
    documentId = doc.id!;
    const storage = getArtifactStorage();
    const uploaded = await storage.putArtifact({ documentId, version: 1, pdfBuffer: pdf, filename: `${model.slug}.pdf` });
    objectKey = uploaded.objectKey;
    await store.commitGeneratedArtifact({
      requestId, documentId, targetVersion: 1, respostas: answers,
      artifact: { version: 1, objectKey, sha256: uploaded.sha256, sizeBytes: uploaded.sizeBytes,
        mimeType: "application/pdf", filename: `${model.slug}.pdf`, watermarked: false,
        sourceHash: calculateSourceHash(answers), modelSnapshotHash: calculateModelSnapshotHash(model), generatedAt: now },
      aiQuota: { userId, day: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()), limit: 3 },
      now,
    });
    committed = true;
    await sessionRef.update({ status: "completed", documentId, finalizingRequestId: FieldValue.delete(), finalizingAt: FieldValue.delete(), updatedAt: Date.now() });
    return { documentId, version: 1 };
  } catch (error) {
    if (!committed) {
      if (objectKey) await getArtifactStorage().deleteArtifact(objectKey).catch(() => {});
      if (documentId) await store.deleteDocumentAndArtifacts(documentId).catch(() => {});
      await store.markGenerationFailed(requestId, error instanceof BackendError ? error.code : "GENERATION_FAILED").catch(() => {});
      await sessionRef.update({ finalizingRequestId: FieldValue.delete(), finalizingAt: FieldValue.delete() }).catch(() => {});
    }
    throw error;
  }
}

export async function previewAISession(sessionId: string, userId: string): Promise<Buffer> {
  const session = await getSession(sessionId, userId);
  if (!session.draft || !["reviewing", "approved", "completed"].includes(session.status)) throw new BackendError("INVALID_REQUEST", 400, "Rascunho indisponível.");
  return generatePdfServer(syntheticModel(session), {}, { watermark: true });
}
