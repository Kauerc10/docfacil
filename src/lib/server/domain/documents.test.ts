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
} from "./documents";
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
        declarante_cpf: "123.456.789-00",
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

  it("validates required fields and reconstructs clean responses", () => {
    const rawRespostas = {
      declarante_nome: "  Carlos Souza  ",
      declarante_cpf: "123.456.789-00",
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
      })),
      renderRulesVersion: DOCUMENT_RENDER_RULES_VERSION,
    };
    const expected = createHash("sha256")
      .update(JSON.stringify(canonicalizeJson(snapshot)))
      .digest("hex");

    expect(calculateModelSnapshotHash(modelo)).toBe(expected);
  });
});
