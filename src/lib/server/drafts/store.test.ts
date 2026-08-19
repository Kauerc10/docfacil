import { describe, expect, it } from "bun:test";
import { InMemoryDraftStore } from "./store";

const base = {
  modeloSlug: "declaracao-residencia",
  respostas: { nome: "Maria" },
  stepIndex: 2,
  clausulasSelecionadas: [],
  extrasPorClausula: {},
};

describe("InMemoryDraftStore", () => {
  it("salva, lista, carrega e atualiza o mesmo rascunho", async () => {
    const store = new InMemoryDraftStore();
    const created = await store.save("usr_1", base);

    expect(created.id).toBeDefined();
    expect((await store.list("usr_1"))).toHaveLength(1);
    expect((await store.get("usr_1", created.id))?.respostas.nome).toBe("Maria");

    const updated = await store.save("usr_1", {
      ...base,
      draftId: created.id,
      respostas: { nome: "Maria Souza" },
      stepIndex: 3,
    });

    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.respostas.nome).toBe("Maria Souza");
    expect(updated.stepIndex).toBe(3);
  });

  it("preserva o documento de origem ao salvar uma edicao para depois", async () => {
    const store = new InMemoryDraftStore();
    const created = await store.save("usr_1", {
      ...base,
      sourceDocumentId: "doc_original",
    });

    const updated = await store.save("usr_1", {
      ...base,
      draftId: created.id,
      respostas: { nome: "Maria Atualizada" },
    });

    expect(updated.sourceDocumentId).toBe("doc_original");
    expect((await store.get("usr_1", created.id))?.sourceDocumentId).toBe("doc_original");
  });

  it("isola ownership entre contas", async () => {
    const store = new InMemoryDraftStore();
    const created = await store.save("usr_owner", base);

    try {
      await store.get("usr_other", created.id);
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe("DRAFT_FORBIDDEN");
      expect(error.status).toBe(403);
    }
  });

  it("remove rascunho depois da finalizacao", async () => {
    const store = new InMemoryDraftStore();
    const created = await store.save("usr_1", base);
    await store.delete("usr_1", created.id);
    expect(await store.get("usr_1", created.id)).toBeNull();
  });
});
