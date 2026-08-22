import { describe, expect, it } from "bun:test";
import { getModelo } from "@/lib/modelos";
import { getCreateFinalizationGuard } from "@/lib/documents/create-finalization-guard";

const modelo = getModelo("contrato-locacao")!;

describe("proteção antes de finalizar a criação", () => {
  it("leva de volta aos moradores quando existe um cartão incompleto", () => {
    const guard = getCreateFinalizationGuard(modelo, {
      moradores_autorizados: JSON.stringify([{ nome: "" }]),
    });

    expect(guard).toEqual({
      stepIndex: 4,
      message: "Informe o nome completo de cada morador adicional.",
    });
  });

  it("permite finalizar quando os moradores estão completos", () => {
    expect(
      getCreateFinalizationGuard(modelo, {
        moradores_autorizados: JSON.stringify([{ nome: "Maicon" }]),
      })
    ).toBeNull();
  });
});
