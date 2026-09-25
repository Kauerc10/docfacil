import "server-only";
import { Annotation, Command, END, START, StateGraph, interrupt } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { MODELOS } from "@/lib/modelos";
import { classificationSchema, analysisPolicy } from "@/lib/ai/policy";
import { aiDraftSchema, validateDraft, type AIDocumentDraft, type ClauseReference } from "@/lib/ai/types";
import { retrieveClauses } from "@/lib/ai/corpus";
import { groqStructured } from "./groq";
import { reserveLLMCall } from "./session-store";
import { FirestoreAICheckpointer } from "./firestore-checkpointer";

const State = Annotation.Root({
  sessionId: Annotation<string>, userId: Annotation<string>, request: Annotation<string>,
  documentType: Annotation<string>, blocked: Annotation<boolean>, reason: Annotation<string>,
  suggestion: Annotation<{ slug: string; name: string } | null>,
  choice: Annotation<"standard" | "ai">,
  questions: Annotation<string[]>, answers: Annotation<Record<string, string>>,
  references: Annotation<ClauseReference[]>, warnings: Annotation<string[]>,
  draft: Annotation<AIDocumentDraft>, validation: Annotation<string[]>, approved: Annotation<boolean>,
});

const graphBuilder = new StateGraph(State)
  .addNode("classify", async (state) => {
    await reserveLLMCall(state.sessionId, state.userId);
    const result = await groqStructured("classify_document", classificationSchema, analysisPolicy,
      JSON.stringify({ request: state.request, models: MODELOS.map((m) => ({ slug: m.slug, name: m.nome, description: m.desc })) }), 1400);
    const model = MODELOS.find((m) => m.slug === result.suggestedSlug);
    return { documentType: result.documentType, blocked: result.blocked, reason: result.reason,
      questions: result.questions, suggestion: model ? { slug: model.slug, name: model.nome } : null };
  })
  .addNode("choose", (state) => {
    const choice = interrupt({ kind: "model_choice", suggestion: state.suggestion });
    if (choice !== "standard" && choice !== "ai") throw new Error("Invalid model choice");
    return { choice };
  })
  .addNode("collect", (state) => {
    if (!state.questions.length) return { answers: {} };
    const answer = interrupt({ kind: "questions", questions: state.questions });
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) throw new Error("Invalid answers");
    const values = answer as Record<string, unknown>;
    const answers: Record<string, string> = {};
    for (const question of state.questions) {
      const value = values[question];
      if (typeof value !== "string" || !value.trim() || value.length > 1500) throw new Error("Missing answer");
      answers[question] = value.trim();
    }
    return { answers };
  })
  .addNode("retrieve", (state) => {
    const references = retrieveClauses(`${state.documentType} ${state.request}`, 8);
    return { references, warnings: references.length < 2 ? ["Há poucas referências internas para este pedido. Revise o conteúdo com atenção."] : [] };
  })
  .addNode("draft_document", async (state) => {
    await reserveLLMCall(state.sessionId, state.userId);
    const system = `Redija um rascunho documental extrajudicial brasileiro em português, claro e objetivo. Use apenas fatos fornecidos pelo usuário. Não invente partes, CPF, datas, valores, citações ou requisitos legais. Referências normativas são contexto; templates são exemplos, não regras universais. Use somente referenceIds fornecidos. Não use HTML nem marcadores de preenchimento. Até 3000 palavras. JSON.`;
    const user = JSON.stringify({ request: state.request, documentType: state.documentType, answers: state.answers,
      references: state.references.map(({ id, text, kind, source }) => ({ id, text, kind, source })) });
    let draft = await groqStructured("draft_document", aiDraftSchema, system, user, 3800);
    let issues = validateDraft(draft, state.references, state.answers);
    if (issues.length) {
      await reserveLLMCall(state.sessionId, state.userId);
      draft = await groqStructured("correct_document", aiDraftSchema, system,
        JSON.stringify({ original: user, draft, issues }), 3800);
      issues = validateDraft(draft, state.references, state.answers);
    }
    return { draft, validation: issues };
  })
  .addNode("review", (state) => {
    const result = interrupt({ kind: "review", draft: state.draft, issues: state.validation });
    if (!result || typeof result !== "object") throw new Error("Invalid approval");
    const { draft, approved } = result as { draft: unknown; approved: unknown };
    const parsed = aiDraftSchema.safeParse(draft);
    if (!parsed.success || approved !== true || validateDraft(parsed.data, state.references, state.answers).length) {
      throw new Error("Draft is not valid for approval");
    }
    return { draft: parsed.data, validation: [], approved: true };
  })
  .addEdge(START, "classify")
  .addConditionalEdges("classify", (state) => state.blocked ? END : state.suggestion ? "choose" : "collect")
  .addConditionalEdges("choose", (state) => state.choice === "standard" ? END : "collect")
  .addEdge("collect", "retrieve")
  .addEdge("retrieve", "draft_document")
  .addEdge("draft_document", "review")
  .addEdge("review", END);

export function createDocumentGraph(checkpointer: BaseCheckpointSaver) {
  return graphBuilder.compile({ checkpointer });
}

const graph = createDocumentGraph(new FirestoreAICheckpointer());

export type GraphValues = typeof State.State;

export async function invokeDocumentGraph(sessionId: string, input?: { userId: string; request: string }, resume?: unknown) {
  const config = { configurable: { thread_id: sessionId }, recursionLimit: 20 };
  if (resume !== undefined) await graph.invoke(new Command({ resume }), config);
  else if (input) {
    const prior = await graph.getState(config);
    if (!prior.values || !Object.keys(prior.values).length) {
      await graph.invoke({ sessionId, userId: input.userId, request: input.request,
        answers: {}, references: [], warnings: [], questions: [], validation: [], approved: false }, config);
    } else if (!prior.tasks.some((task) => Boolean(task.interrupts?.length))) {
      await graph.invoke(null, config);
    }
  }
  const state = await graph.getState(config);
  return { values: state.values as GraphValues, interrupted: state.tasks.some((task) => Boolean(task.interrupts?.length)) };
}

export async function readDocumentGraph(sessionId: string): Promise<{ values: GraphValues; interrupted: boolean }> {
  const state = await graph.getState({ configurable: { thread_id: sessionId } });
  return { values: state.values as GraphValues, interrupted: state.tasks.some((task) => Boolean(task.interrupts?.length)) };
}

export async function continueDocumentGraph(sessionId: string): Promise<{ values: GraphValues }> {
  const config = { configurable: { thread_id: sessionId }, recursionLimit: 20 };
  await graph.invoke(null, config);
  const state = await graph.getState(config);
  return { values: state.values as GraphValues };
}
