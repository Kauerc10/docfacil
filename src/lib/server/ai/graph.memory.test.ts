import { describe, expect, mock, test } from "bun:test";
import { Command, MemorySaver } from "@langchain/langgraph";

mock.module("./groq", () => ({
  groqStructured: async (name: string) => name === "classify_document"
    ? { documentType: "Termo de empréstimo", blocked: false, reason: "", questions: ["Quem recebe o equipamento?"], suggestedSlug: "" }
    : { title: "Termo de empréstimo de equipamento", sections: [
      { title: "Entrega", paragraphs: ["Ana entrega o notebook Dell a Bruno para uso durante trinta dias."] },
      { title: "Devolução", paragraphs: ["Bruno devolverá o notebook Dell a Ana ao fim do período combinado."] },
    ], referenceIds: [] },
}));
mock.module("./session-store", () => ({ reserveLLMCall: async () => {} }));

describe("grafo documental", () => {
  test("interrompe para coletar dados e aprovar o rascunho editado", async () => {
    const { createDocumentGraph } = await import("./graph");
    const graph = createDocumentGraph(new MemorySaver());
    const config = { configurable: { thread_id: crypto.randomUUID() } };
    await graph.invoke({ sessionId: config.configurable.thread_id, userId: "pilot", request: "Emprestar notebook Dell de Ana a Bruno por trinta dias", answers: {}, references: [], warnings: [], questions: [], validation: [], approved: false }, config);
    let state = await graph.getState(config);
    expect(state.values.questions).toEqual(["Quem recebe o equipamento?"]);
    expect(state.tasks.some((task) => task.interrupts.length > 0)).toBe(true);
    await graph.invoke(new Command({ resume: { "Quem recebe o equipamento?": "Bruno" } }), config);
    state = await graph.getState(config);
    expect(state.values.draft.sections).toHaveLength(2);
    const edited = { ...state.values.draft, sections: [
      { ...state.values.draft.sections[0], paragraphs: ["Ana entrega o notebook Dell a Bruno, que o usará durante trinta dias."] },
      state.values.draft.sections[1],
    ] };
    await graph.invoke(new Command({ resume: { approved: true, draft: edited } }), config);
    state = await graph.getState(config);
    expect(state.values.approved).toBe(true);
    expect(state.values.draft.sections[0].paragraphs[0]).toContain("que o usará");
  });
});
