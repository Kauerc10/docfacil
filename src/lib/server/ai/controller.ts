import "server-only";
import { z } from "zod";
import { aiDraftSchema, aiEditableDraftSchema, validateDraft, type AIDocumentSession } from "@/lib/ai/types";
import { BackendError } from "@/lib/server/errors";
import { groqStructured } from "./groq";
import { continueDocumentGraph, invokeDocumentGraph, readDocumentGraph, type GraphValues } from "./graph";
import { getSession, reserveLLMCall, updateSession } from "./session-store";

export function mirrorGraph(session: AIDocumentSession, state: GraphValues): AIDocumentSession {
  const status = state.approved ? "approved" : state.blocked ? "blocked"
    : state.choice === "standard" ? "standard"
    : state.draft ? "reviewing" : state.suggestion && !state.choice ? "model_choice"
    : state.questions?.length && !Object.keys(state.answers ?? {}).length ? "collecting" : "drafting";
  return {
    ...session, status,
    documentType: state.documentType,
    blockReason: state.blocked ? state.reason : undefined,
    modelSuggestion: state.suggestion ?? undefined,
    modelChoice: state.choice,
    questions: state.questions ?? [], answers: state.answers ?? {},
    references: state.references ?? [], warnings: state.warnings ?? [],
    draft: state.draft,
    validation: state.draft ? { version: session.version + 1, issues: state.validation ?? [] } : undefined,
    approvedVersion: state.approved ? session.version + 1 : undefined,
    pendingResume: undefined,
    pendingStage: undefined,
  };
}

export async function runInitial(session: AIDocumentSession, operationId: string): Promise<AIDocumentSession> {
  const claimed = await updateSession(session.id, session.ownerId, session.version, operationId, (current) => ({ ...current, status: "classifying" }));
  try {
    const result = await invokeDocumentGraph(session.id, { userId: session.ownerId, request: session.request });
    return updateSession(session.id, session.ownerId, claimed.version, `${operationId}:result`, (current) => mirrorGraph(current, result.values));
  } catch (error) {
    await updateSession(session.id, session.ownerId, claimed.version, `${operationId}:paused`, (current) => ({ ...current, status: "paused" })).catch(() => {});
    throw error;
  }
}

export async function resumeSession(session: AIDocumentSession, expectedVersion: number, operationId: string, value: unknown): Promise<AIDocumentSession> {
  if (session.version !== expectedVersion) throw new BackendError("CONFLICT", 409, "Sessão alterada em outra aba.");
  if (session.lastOperationId === operationId) return session;
  if (!["model_choice", "collecting", "reviewing"].includes(session.status)) throw new BackendError("INVALID_REQUEST", 400, "Esta etapa não espera uma resposta.");
  // A transação reserva a operação antes de qualquer chamada externa.
  const claimed = await updateSession(session.id, session.ownerId, expectedVersion, operationId, (current) => ({
    ...current, status: "drafting", pendingResume: value, pendingStage: current.status,
  }));
  try {
    const result = await invokeDocumentGraph(session.id, undefined, value);
    return updateSession(session.id, session.ownerId, claimed.version, `${operationId}:result`, (current) => mirrorGraph(current, result.values));
  } catch (error) {
    await updateSession(session.id, session.ownerId, claimed.version, `${operationId}:paused`, (current) => ({ ...current, status: "paused" })).catch(() => {});
    throw error;
  }
}

export async function saveDraft(session: AIDocumentSession, expectedVersion: number, operationId: string, raw: unknown): Promise<AIDocumentSession> {
  if (session.status !== "reviewing" || !session.draft) throw new BackendError("INVALID_REQUEST", 400, "Rascunho indisponível para edição.");
  const parsed = aiEditableDraftSchema.safeParse(raw);
  if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Formato do rascunho inválido.");
  return updateSession(session.id, session.ownerId, expectedVersion, operationId, (current) => ({
    ...current, draft: parsed.data, approvedVersion: undefined,
    validation: { version: current.version + 1, issues: validateDraft(parsed.data, current.references, current.answers) },
  }));
}

export async function validateSessionDraft(session: AIDocumentSession, expectedVersion: number, operationId: string): Promise<AIDocumentSession> {
  if (session.status !== "reviewing" || !session.draft) throw new BackendError("INVALID_REQUEST", 400, "Rascunho indisponível.");
  return updateSession(session.id, session.ownerId, expectedVersion, operationId, (current) => ({
    ...current, validation: { version: current.version + 1, issues: validateDraft(current.draft!, current.references, current.answers) },
  }));
}

export async function approveSession(session: AIDocumentSession, expectedVersion: number, operationId: string): Promise<AIDocumentSession> {
  if (session.status !== "reviewing" || !session.draft || !session.validation || session.validation.version !== session.version || session.validation.issues.length) {
    throw new BackendError("INVALID_REQUEST", 400, "Valide a versão atual antes de aprovar.");
  }
  return resumeSession(session, expectedVersion, operationId, { approved: true, draft: session.draft });
}

export async function reviseSession(session: AIDocumentSession, expectedVersion: number, operationId: string, instruction: string): Promise<AIDocumentSession> {
  if (session.status !== "reviewing" || !session.draft || session.revisions >= 2) throw new BackendError("FREE_LIMIT_REACHED", 429, "Limite de duas revisões por IA atingido.");
  const reserved = await updateSession(session.id, session.ownerId, expectedVersion, operationId, (current) => ({ ...current, revisions: current.revisions + 1, status: "drafting" }));
  try {
    await reserveLLMCall(session.id, session.ownerId);
    const draft = await groqStructured("revise_document", aiDraftSchema,
      "Revise o documento em português conforme a instrução, sem inventar fatos nem referências. Preserve referenceIds disponíveis. Não use HTML ou marcadores. Retorne JSON.",
      JSON.stringify({ instruction, draft: session.draft, answers: session.answers, referenceIds: session.references.map((r) => r.id) }), 3800);
    return updateSession(session.id, session.ownerId, reserved.version, `${operationId}:result`, (current) => ({
      ...current, status: "reviewing", draft, approvedVersion: undefined,
      validation: { version: current.version + 1, issues: validateDraft(draft, current.references, current.answers) },
    }));
  } catch (error) {
    await updateSession(session.id, session.ownerId, reserved.version, `${operationId}:paused`, (current) => ({ ...current, status: "reviewing" })).catch(() => {});
    throw error;
  }
}

export const sessionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("choose"), value: z.enum(["standard", "ai"]) }),
  z.object({ action: z.literal("answer"), value: z.record(z.string(), z.string().max(1500)) }),
  z.object({ action: z.literal("save"), value: aiEditableDraftSchema }),
  z.object({ action: z.literal("validate") }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("revise"), instruction: z.string().trim().min(3).max(1000) }),
  z.object({ action: z.literal("retry") }),
]).and(z.object({ expectedVersion: z.number().int().positive(), operationId: z.string().uuid() }));

export async function performAction(id: string, userId: string, input: z.infer<typeof sessionActionSchema>): Promise<AIDocumentSession> {
  const session = await getSession(id, userId);
  if (session.lastOperationId === input.operationId || session.lastOperationId === `${input.operationId}:result`) return session;
  switch (input.action) {
    case "choose": return resumeSession(session, input.expectedVersion, input.operationId, input.value);
    case "answer": return resumeSession(session, input.expectedVersion, input.operationId, input.value);
    case "save": return saveDraft(session, input.expectedVersion, input.operationId, input.value);
    case "validate": return validateSessionDraft(session, input.expectedVersion, input.operationId);
    case "approve": return approveSession(session, input.expectedVersion, input.operationId);
    case "revise": return reviseSession(session, input.expectedVersion, input.operationId, input.instruction);
    case "retry": {
      if (session.status !== "paused" && !(session.status === "drafting" && session.updatedAt < Date.now() - 120_000)) {
        throw new BackendError("INVALID_REQUEST", 400, "A sessão não está pronta para retomada.");
      }
      const snapshot = await readDocumentGraph(session.id);
      const state = snapshot.values;
      const advanced = session.pendingStage === "model_choice"
        ? state.choice === "standard" || Boolean(state.choice === "ai" && (snapshot.interrupted || state.draft))
        : session.pendingStage === "collecting" ? Boolean(state.draft)
        : session.pendingStage === "reviewing" ? Boolean(state.approved) : false;
      const shouldContinue = !advanced && !snapshot.interrupted && (
        session.pendingStage === "collecting" && Boolean(state.answers && Object.keys(state.answers).length)
        || session.pendingStage === "model_choice" && Boolean(state.choice)
      );
      const result = advanced ? { values: state } : shouldContinue
        ? await continueDocumentGraph(session.id) : session.pendingResume !== undefined
        ? await invokeDocumentGraph(session.id, undefined, session.pendingResume)
        : await invokeDocumentGraph(session.id, { userId, request: session.request });
      return updateSession(id, userId, input.expectedVersion, input.operationId, (current) => mirrorGraph(current, result.values));
    }
  }
}
