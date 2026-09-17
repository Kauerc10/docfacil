import { describe, expect, it, beforeEach } from "bun:test";
import {
  compileDraftAnswers,
  saveClientDraft,
  loadSessionDraft,
  deleteClientDraft,
  finalizeClientDraft,
  type ClientDraft,
} from "@/lib/documents/client-document";
import {
  clearGuestDraft,
  loadGuestDraft,
} from "@/lib/documents/client";

describe("ClientDocument - compileDraftAnswers", () => {
  it("compila respostas básicas sem mutar o objeto de entrada", () => {
    const input = {
      respostas: { locador_nome: "Maria Silva", aluguel: "2500" },
    };
    const compiled = compileDraftAnswers(input);

    expect(compiled).toEqual({
      locador_nome: "Maria Silva",
      aluguel: "2500",
    });
    expect(compiled).not.toBe(input.respostas);
  });

  it("filtra chaves internas com prefixo __ (metadados do formulário)", () => {
    const input = {
      respostas: {
        __meta_step: "2",
        __internal_flag: "true",
        nome: "João Silva",
      },
      extrasPorClausula: {
        clausula_1: {
          __extra_meta: "abc",
          multa_atraso: "10%",
        },
      },
      clausulasSelecionadas: ["clausula_1"],
    };

    const compiled = compileDraftAnswers(input);

    expect(compiled).toEqual({
      nome: "João Silva",
      multa_atraso: "10%",
    });
    expect(compiled.__meta_step).toBeUndefined();
    expect(compiled.__internal_flag).toBeUndefined();
    expect(compiled.__extra_meta).toBeUndefined();
  });

  it("mescla extras apenas das cláusulas selecionadas quando a lista for especificada", () => {
    const input = {
      respostas: { locador_nome: "Carlos" },
      clausulasSelecionadas: ["caucao"],
      extrasPorClausula: {
        caucao: {
          caucao_meses: "3",
          caucao_valor: "7500",
        },
        animais: {
          animais_detalhes: "1 gato",
        },
      },
    };

    const compiled = compileDraftAnswers(input);

    expect(compiled).toEqual({
      locador_nome: "Carlos",
      caucao_meses: "3",
      caucao_valor: "7500",
    });
    expect(compiled.animais_detalhes).toBeUndefined();
  });

  it("mescla todos os extras quando clausulasSelecionadas não for informada", () => {
    const input = {
      respostas: { locador_nome: "Carlos" },
      extrasPorClausula: {
        caucao: { caucao_meses: "2" },
        animais: { animais_detalhes: "1 cachorro" },
      },
    };

    const compiled = compileDraftAnswers(input);

    expect(compiled).toEqual({
      locador_nome: "Carlos",
      caucao_meses: "2",
      animais_detalhes: "1 cachorro",
    });
  });

  it("preserva campos JSON estruturados sem alteração", () => {
    const moradores = JSON.stringify([{ nome: "Lucas Lima", cpf: "000.111.222-33" }]);
    const input = {
      respostas: {
        locador_nome: "Patrícia",
        moradores_autorizados: moradores,
      },
    };

    const compiled = compileDraftAnswers(input);
    expect(compiled.moradores_autorizados).toBe(moradores);
  });
});

describe("ClientDocument - Lifecycle & Persistence", () => {
  const testSlug = "declaracao-residencia-teste";

  beforeEach(() => {
    clearGuestDraft(testSlug);
  });

  it("salva e carrega rascunho de usuário guest de forma transparente", async () => {
    const draftInput = {
      modeloSlug: testSlug,
      respostas: { declarante_nome: "Marina Souza" },
      stepIndex: 2,
      clausulasSelecionadas: ["clausula_a"],
      extrasPorClausula: { clausula_a: { extra_info: "abc" } },
      guestContact: { email: "marina@example.com" },
    };

    const saved = await saveClientDraft(draftInput, null);
    expect(saved.modeloSlug).toBe(testSlug);
    expect(saved.respostas.declarante_nome).toBe("Marina Souza");
    expect(saved.stepIndex).toBe(2);
    expect(saved.updatedAt).toBeDefined();

    // Carrega a sessão sem usuário (guest)
    const loaded = await loadSessionDraft({ slug: testSlug, user: null });
    expect(loaded).not.toBeNull();
    expect(loaded?.respostas.declarante_nome).toBe("Marina Souza");
    expect(loaded?.stepIndex).toBe(2);
    expect(loaded?.clausulasSelecionadas).toEqual(["clausula_a"]);
    expect(loaded?.guestContact?.email).toBe("marina@example.com");

    // Limpa o rascunho
    await deleteClientDraft({ slug: testSlug }, null);
    const afterDelete = await loadSessionDraft({ slug: testSlug, user: null });
    expect(afterDelete).toBeNull();
  });

  it("retorna null ao carregar sessão sem nenhum rascunho prévio", async () => {
    const loaded = await loadSessionDraft({ slug: "slug-inexistente", user: null });
    expect(loaded).toBeNull();
  });
});

describe("ClientDocument - finalizeClientDraft", () => {
  const testSlug = "contrato-locacao-finalizacao";

  beforeEach(() => {
    clearGuestDraft(testSlug);
  });

  it("finaliza rascunho novo e limpa o armazenamento local automaticamente", async () => {
    const draft: ClientDraft = {
      modeloSlug: testSlug,
      respostas: { locador: "Ana", aluguel: "2000" },
      stepIndex: 3,
      clausulasSelecionadas: ["multa"],
      extrasPorClausula: { multa: { multa_percentual: "10%" } },
      updatedAt: Date.now(),
    };

    await saveClientDraft(draft, null);
    expect(loadGuestDraft(testSlug)).not.toBeNull();

    let calledWith: any = null;
    const mockFinalizer = async (input: any) => {
      calledWith = input;
      return {
        document: {
          id: "doc_123",
          version: 1,
          artifactState: "ready",
          guestAccessPath: "/d/magic123",
        },
      };
    };

    const result = await finalizeClientDraft({
      draft,
      orderId: "order_999",
      user: null,
      finalizer: mockFinalizer,
    });

    expect(result.document.id).toBe("doc_123");
    expect(result.isNewVersion).toBe(false);
    expect(calledWith.respostas).toEqual({
      locador: "Ana",
      aluguel: "2000",
      multa_percentual: "10%",
    });
    expect(calledWith.orderId).toBe("order_999");

    // Verifica que o rascunho foi limpo automaticamente
    expect(loadGuestDraft(testSlug)).toBeNull();
  });

  it("chama criador de versão quando o rascunho possui sourceDocumentId", async () => {
    const draft: ClientDraft = {
      modeloSlug: testSlug,
      sourceDocumentId: "doc_original_456",
      respostas: { locador: "Ana Atualizada", aluguel: "2200" },
      stepIndex: 3,
      clausulasSelecionadas: [],
      extrasPorClausula: {},
      updatedAt: Date.now(),
    };

    let calledDocId: string | null = null;
    let calledPayload: any = null;

    const mockVersionCreator = async (docId: string, payload: any) => {
      calledDocId = docId;
      calledPayload = payload;
      return {
        document: {
          id: docId,
          version: 2,
          artifactState: "ready",
        },
      };
    };

    const result = await finalizeClientDraft({
      draft,
      user: { uid: "usr_1" },
      versionCreator: mockVersionCreator,
    });

    expect(result.document.id).toBe("doc_original_456");
    expect(result.document.version).toBe(2);
    expect(result.isNewVersion).toBe(true);
    expect(calledDocId as unknown as string).toBe("doc_original_456");
    expect(calledPayload.respostas.locador).toBe("Ana Atualizada");
  });
});
