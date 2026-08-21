import { createHash } from "crypto";
import { describe, expect, it } from "bun:test";
import {
  documentDraftInputSchema,
  reconstructAndValidateResponses,
  generateAccessToken,
  hashToken,
  calculateSourceHash,
  calculateModelSnapshotHash,
  canonicalizeJson,
  reconstructDuplicateDraft,
} from "./documents";
import { fillDocument } from "../../document-engine";
import { BackendError } from "../errors";
import { MODELOS } from "../../modelos";
import { DOCUMENT_RENDER_RULES_VERSION } from "../../document-engine/legal-rules";
import type { Modelo } from "../../types";

describe("documentDraftInputSchema", () => {
  it("validates a valid draft input payload", () => {
    const valid = {
      requestId: "a8098c1a-f86e-11da-bd1a-00112444be1e",
      modeloSlug: "declaracao-residencia",
      respostas: {
        declarante_nome: "Maria Silva",
        declarante_cpf: "111.444.777-35",
      },
      clausulasSelecionadas: ["garantia"],
      guestContact: {
        email: "maria@example.com",
      },
    };

    const parsed = documentDraftInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects payload with internal __clausula_ keys injected into respostas", () => {
    const invalid = {
      requestId: "550e8400-e29b-41d4-a716-446655440000",
      modeloSlug: "declaracao-residencia",
      respostas: {
        __clausula_injected: "evil",
        declarante_nome: "Maria",
      },
    };

    const parsed = documentDraftInputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid UUID for requestId", () => {
    const invalid = {
      requestId: "not-a-uuid",
      modeloSlug: "declaracao-residencia",
      respostas: {},
    };

    const parsed = documentDraftInputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe("reconstructAndValidateResponses", () => {
  const modelo = MODELOS.find((m) => m.slug === "declaracao-residencia") || MODELOS[0];
  const modeloComEstadoCivilHistorico: Modelo = {
    ...modelo,
    campos: [
      {
        key: "estado_civil",
        pergunta: "Estado civil",
        tipo: "text",
      },
    ],
    etapas: [],
  };

  it("validates required fields and reconstructs clean responses", () => {
    const rawRespostas = {
      declarante_nome: "  Carlos Souza  ",
      declarante_cpf: "111.444.777-35",
      declarante_nacionalidade: "Brasileiro",
      declarante_estado_civil: "Solteiro",
      declarante_profissao: "Desenvolvedor",
      declarante_cep: "01310-100",
      declarante_rua: "Av. Paulista",
      declarante_numero: "1000",
      declarante_bairro: "Bela Vista",
      declarante_cidade: "São Paulo",
      declarante_uf: "SP",
      finalidade: "Comprovação bancária",
      cidade_data: "São Paulo, 14 de agosto de 2026",
      unwanted_extra_key: "should_be_stripped",
    };

    const cleaned = reconstructAndValidateResponses(modelo, rawRespostas, []);
    expect(cleaned.declarante_nome).toBe("Carlos Souza");
    expect((cleaned as any).unwanted_extra_key).toBeUndefined();
  });

  it("normaliza aliases de estado civil antes de sanitizar", () => {
    const historico = reconstructAndValidateResponses(
      modeloComEstadoCivilHistorico,
      { estado_civil: " DI " },
      []
    );
    const porParte = reconstructAndValidateResponses(
      modelo,
      {
        declarante_nome: "Carlos Souza",
        declarante_cpf: "111.444.777-35",
        declarante_nacionalidade: "Brasileiro",
        declarante_estado_civil: "di",
        declarante_profissao: "Desenvolvedor",
        declarante_cep: "01310-100",
        declarante_rua: "Av. Paulista",
        declarante_numero: "1000",
        declarante_bairro: "Bela Vista",
        declarante_cidade: "São Paulo",
        declarante_uf: "SP",
        finalidade: "Comprovação bancária",
        cidade_data: "São Paulo, 14 de agosto de 2026",
      },
      []
    );

    expect(historico.estado_civil).toBe("divorciado(a)");
    expect(porParte.declarante_estado_civil).toBe("divorciado(a)");
  });

  it("rejeita estado civil desconhecido", () => {
    expect(() =>
      reconstructAndValidateResponses(
        modeloComEstadoCivilHistorico,
        { estado_civil: "casadinho" },
        []
      )
    ).toThrow("Estado civil inválido.");
  });

  it("throws BackendError(INVALID_REQUEST) when required field is missing", () => {
    const incompleteRespostas = {
      declarante_nome: "Carlos",
    };

    expect(() =>
      reconstructAndValidateResponses(modelo, incompleteRespostas, [])
    ).toThrow(BackendError);

    try {
      reconstructAndValidateResponses(modelo, incompleteRespostas, []);
    } catch (err: any) {
      expect(err.code).toBe("INVALID_REQUEST");
      expect(err.status).toBe(400);
    }
  });

  const modeloLocacaoMinimo: Modelo = {
    slug: "contrato-locacao",
    nome: "Locação residencial",
    desc: "fixture semântica",
    quandoUsar: "teste",
    categoria: "Locação",
    minutos: 1,
    icone: "key",
    campos: [],
    etapas: [
      {
        tipo: "clausulas",
        clausulas: [
          { id: "caucao", titulo: "Caução", descricao: "", corpo: "" },
          { id: "fiador", titulo: "Fiador", descricao: "", corpo: "" },
          { id: "seguro_fianca", titulo: "Seguro-fiança", descricao: "", corpo: "" },
        ],
      },
    ],
    template: { titulo: "CONTRATO", corpo: ["Texto"] },
  };

  it("rejects more than one rental guarantee modality", () => {
    expect(() =>
      reconstructAndValidateResponses(
        modeloLocacaoMinimo,
        {},
        ["caucao", "fiador"]
      )
    ).toThrow(BackendError);
  });

  it("rejects cash deposit above three months of rent", () => {
    expect(() =>
      reconstructAndValidateResponses(
        modeloLocacaoMinimo,
        { caucao_meses: "4" },
        ["caucao"]
      )
    ).toThrow(BackendError);
  });

  const imovel = MODELOS.find((m) => m.slug === "contrato-compra-venda-imovel")!;
  const validWithoutRegistry = {
    vendedor_nome: "Ana Silva",
    vendedor_nacionalidade: "Brasileira",
    vendedor_estado_civil: "Solteira",
    vendedor_profissao: "Arquiteta",
    vendedor_cpf: "111.444.777-35",
    vendedor_cep: "89010-000",
    vendedor_rua: "Rua das Flores",
    vendedor_numero: "100",
    vendedor_bairro: "Centro",
    vendedor_cidade: "Blumenau",
    vendedor_uf: "SC",
    comprador_nome: "Bruno Souza",
    comprador_nacionalidade: "Brasileiro",
    comprador_estado_civil: "Solteiro",
    comprador_profissao: "Professor",
    comprador_cpf: "529.982.247-25",
    comprador_cep: "01310-100",
    comprador_rua: "Avenida Paulista",
    comprador_numero: "1000",
    comprador_bairro: "Bela Vista",
    comprador_cidade: "São Paulo",
    comprador_uf: "SP",
    imovel_cep: "89010-000",
    imovel_rua: "Rua XV de Novembro",
    imovel_numero: "500",
    imovel_bairro: "Centro",
    imovel_cidade: "Blumenau",
    imovel_uf: "SC",
    valor: "350.000,00",
    sinal: "35.000,00",
    possui_sinal: "Não",
    saldo_pagamento: "À vista na escritura pública",
  };

  it("rejeita compromisso de imóvel sem identificação registral suficiente", () => {
    expect(() =>
      reconstructAndValidateResponses(imovel, validWithoutRegistry, [])
    ).toThrow("matrícula");
  });

  const validPropertyVersion = {
    ...validWithoutRegistry,
    vendedor_rg: "12.345.678-9",
    comprador_rg: "98.765.432-1",
    matricula_imovel: "12.345",
    registro_imoveis: "1º Registro de Imóveis de Blumenau/SC",
    descricao_registral: "Apartamento 302, com área privativa de 80 m².",
    possui_sinal: "Sim",
    sinal: "35.000,00",
    forma_pagamento_sinal: "PIX",
  };

  it("exige o valor quando o compromisso prevê sinal", () => {
    const { sinal: _sinal, ...withoutDepositValue } = validPropertyVersion;

    expect(() =>
      reconstructAndValidateResponses(
        imovel,
        withoutDepositValue,
        []
      )
    ).toThrow("valor do sinal");
  });

  it("exige a forma de pagamento quando o compromisso prevê sinal", () => {
    const { forma_pagamento_sinal: _paymentMethod, ...withoutPaymentMethod } = validPropertyVersion;

    expect(() =>
      reconstructAndValidateResponses(imovel, withoutPaymentMethod, [])
    ).toThrow("forma de pagamento do sinal");
  });

  it("reconstrói uma nova versão imobiliária completa sem placeholders", () => {
    const respostas = reconstructAndValidateResponses(imovel, validPropertyVersion, []);
    const document = fillDocument({
      titulo: imovel.template.titulo,
      corpo: imovel.template.corpo,
      respostas,
      modelo: imovel,
    }).join("\n");

    expect(document).toContain("arras confirmatórias");
    expect(document).not.toContain("matriculado sob o nº ________________________");
    expect(document).not.toContain("pago mediante ________________________");
  });

  it("normaliza respostas legadas de comodato e imóvel no rascunho duplicado", () => {
    const comodato = MODELOS.find((m) => m.slug === "comodato")!;
    const withoutDeposit = reconstructDuplicateDraft(imovel, {
      sinal: "",
      saldo_pagamento: "À vista",
    });
    const withDeposit = reconstructDuplicateDraft(imovel, {
      sinal: "35.000,00",
      saldo_pagamento: "À vista",
    });
    const legacyComodato = reconstructDuplicateDraft(comodato, {
      prazo: "seis meses",
    });

    expect(withoutDeposit.respostas.possui_sinal).toBe("Não");
    expect(withDeposit.respostas.possui_sinal).toBe("Sim");
    expect(withDeposit.respostas).not.toHaveProperty("__sinal_legado_sem_forma");
    expect(legacyComodato.respostas.periodo_emprestimo).toBe("seis meses");
  });

  it("exige a atualização registral somente ao validar uma nova versão", () => {
    const { possui_sinal: _possuiSinal, ...legacyPropertyAnswers } = validWithoutRegistry;
    const legacyDraft = reconstructDuplicateDraft(imovel, legacyPropertyAnswers);

    expect(legacyDraft.respostas.possui_sinal).toBe("Sim");
    expect(() =>
      reconstructAndValidateResponses(imovel, legacyDraft.respostas, [])
    ).toThrow("Atualize esta nova versão");
  });
});

describe("tokens and hashes", () => {
  it("generates 256-bit base64url token and produces deterministic SHA-256 hash", () => {
    const { token, tokenHash } = generateAccessToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash.length).toBe(64);
  });

  it("calculates deterministic sourceHash regardless of key insertion order", () => {
    const r1 = { a: "1", b: "2", c: "3" };
    const r2 = { c: "3", a: "1", b: "2" };

    const h1 = calculateSourceHash(r1);
    const h2 = calculateSourceHash(r2);

    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
  });

  it("calculates deterministic modelSnapshotHash", () => {
    const modelo = MODELOS[0];
    const h1 = calculateModelSnapshotHash(modelo);
    const h2 = calculateModelSnapshotHash(modelo);

    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
  });

  it("includes the material render-rules version in modelSnapshotHash", () => {
    const modelo = MODELOS[0];
    const snapshot = {
      slug: modelo.slug,
      nome: modelo.nome,
      template: modelo.template,
      etapas: modelo.etapas ?? [],
      campos: (modelo.campos || []).map((c) => ({
        key: c.key,
        pergunta: c.pergunta,
        tipo: c.tipo,
        obrigatorio: c.obrigatorio,
        visivelQuando: c.visivelQuando,
        listaPessoas: c.listaPessoas,
      })),
      renderRulesVersion: DOCUMENT_RENDER_RULES_VERSION,
    };
    const expected = createHash("sha256")
      .update(JSON.stringify(canonicalizeJson(snapshot)))
      .digest("hex");

    expect(calculateModelSnapshotHash(modelo)).toBe(expected);
  });

  it("inclui a visibilidade condicional no snapshot material do modelo", () => {
    const modelo = MODELOS.find((item) => item.slug === "contrato-compra-venda-imovel")!;
    const condicionalRemovida: Modelo = {
      ...modelo,
      campos: modelo.campos.map((campo) =>
        campo.key === "sinal" ? { ...campo, visivelQuando: undefined } : campo
      ),
      etapas: modelo.etapas?.map((etapa) =>
        etapa.tipo === "campo_grupo"
          ? {
              ...etapa,
              campos: etapa.campos.map((campo) =>
                campo.key === "sinal" ? { ...campo, visivelQuando: undefined } : campo
              ),
            }
          : etapa
      ),
    };

    expect(calculateModelSnapshotHash(modelo)).not.toBe(
      calculateModelSnapshotHash(condicionalRemovida)
    );
  });
});
