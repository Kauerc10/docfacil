import { describe, expect, it } from "bun:test";
import { MODELOS } from "@/lib/modelos";
import {
  calculateModelSnapshotHash,
  calculateSourceHash,
} from "@/lib/server/domain/documents";

describe("Model Snapshots and Integrity Hashes", () => {
  it("all models in the catalog have required properties and generate valid hashes", () => {
    expect(MODELOS.length).toBeGreaterThanOrEqual(5);

    for (const modelo of MODELOS) {
      expect(modelo.slug).toBeDefined();
      expect(modelo.nome).toBeDefined();
      expect(modelo.categoria).toBeDefined();
      expect(modelo.etapas).toBeDefined();
      expect(modelo.template).toBeDefined();

      const hash1 = calculateModelSnapshotHash(modelo);
      const hash2 = calculateModelSnapshotHash(modelo);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    }
  });

  it("produces deterministic source hashes regardless of key order", () => {
    const answers1 = {
      nome: "Alice",
      cpf: "123",
      cidade: "SP",
    };

    const answers2 = {
      cidade: "SP",
      nome: "Alice",
      cpf: "123",
    };

    const hash1 = calculateSourceHash(answers1);
    const hash2 = calculateSourceHash(answers2);

    expect(hash1).toBe(hash2);
  });
});
