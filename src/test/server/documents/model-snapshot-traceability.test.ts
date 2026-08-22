import { describe, expect, it } from "bun:test";
import { calculateModelSnapshotHash } from "@/lib/server/domain/documents";
import { MODELOS } from "@/lib/modelos";
import type { Modelo } from "@/lib/types";

type SnapshotHasherWithEditorialIdentity = (
  modelo: Modelo,
  options?: { editorialIdentityVersion?: string }
) => string;

describe("rastreabilidade material do snapshot do modelo", () => {
  it("muda o hash quando muda a identidade editorial do PDF", () => {
    const modelo = MODELOS.find((item) => item.slug === "uniao-estavel");
    if (!modelo) throw new Error("Modelo de união estável não encontrado");

    const calculate = calculateModelSnapshotHash as SnapshotHasherWithEditorialIdentity;

    const formalV1 = calculate(modelo, {
      editorialIdentityVersion: "docfacil-formal-v1",
    });
    const formalV2 = calculate(modelo, {
      editorialIdentityVersion: "docfacil-formal-v2",
    });

    expect(formalV1).not.toBe(formalV2);
  });
});
