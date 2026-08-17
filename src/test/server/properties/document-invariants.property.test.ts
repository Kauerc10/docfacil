import { describe, expect, it } from "bun:test";
import {
  calculateSourceHash,
  calculateModelSnapshotHash,
  generateAccessToken,
  hashToken,
  reconstructAndValidateResponses,
} from "@/lib/server/domain/documents";
import { MODELOS } from "@/lib/modelos";

describe("Document & Cryptographic Invariants (Property-style tests)", () => {
  it("sourceHash is deterministic and invariant to key insertion order in responses", () => {
    const objA = {
      b_field: "value B",
      a_field: "value A",
      z_field: "value Z",
    };

    const objB = {
      z_field: "value Z",
      a_field: "value A",
      b_field: "value B",
    };

    const hashA = calculateSourceHash(objA);
    const hashB = calculateSourceHash(objB);

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generateAccessToken produces valid base64url token and deterministic 64-char sha256 hash", () => {
    for (let i = 0; i < 50; i++) {
      const { token, tokenHash } = generateAccessToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(hashToken(token)).toBe(tokenHash);
    }
  });

  it("modelSnapshotHash is deterministic for every model in catalog", () => {
    for (const modelo of MODELOS) {
      const hash1 = calculateModelSnapshotHash(modelo);
      const hash2 = calculateModelSnapshotHash(modelo);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("reconstructAndValidateResponses strips unknown extraneous keys and preserves valid inputs", () => {
    const modelo = MODELOS.find((m) => m.slug === "declaracao-residencia");
    if (!modelo) throw new Error("Modelo não encontrado");

    const validAnswers: Record<string, string> = {
      declarante_nome: "Maria Teste",
      declarante_cpf: "123.456.789-00",
      declarante_nacionalidade: "Brasileira",
      declarante_estado_civil: "Solteira",
      declarante_profissao: "Engenheira",
      declarante_cep: "01310-100",
      declarante_rua: "Av. Paulista",
      declarante_numero: "100",
      declarante_bairro: "Bela Vista",
      declarante_cidade: "São Paulo",
      declarante_uf: "SP",
      finalidade: "Comprovante",
      cidade_data: "São Paulo, 14 de agosto de 2026",
      // Extraneous malicious / unwanted properties
      __malicious_payload: "drop table users",
      unknown_field_xyz: "should be discarded",
    };

    const sanitized = reconstructAndValidateResponses(modelo, validAnswers, []);
    expect(sanitized.__malicious_payload).toBeUndefined();
    expect(sanitized.unknown_field_xyz).toBeUndefined();
    expect(sanitized.declarante_nome).toBe("Maria Teste");
    expect(sanitized.declarante_cpf).toBe("123.456.789-00");
  });
});
