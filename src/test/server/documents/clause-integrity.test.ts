import { describe, expect, it } from "bun:test";
import type { Modelo } from "@/lib/types";
import { validateModel } from "@/lib/document-engine/model-validator";
import { reconstructAndValidateResponses } from "@/lib/server/domain/documents";

const modelWithClause = (body: string): Modelo => ({
  slug: "modelo-clausula-integridade",
  nome: "Modelo de integridade",
  desc: "Fixture de integridade de cláusulas",
  quandoUsar: "teste",
  categoria: "Pessoal",
  minutos: 1,
  icone: "seal",
  campos: [],
  etapas: [
    {
      tipo: "clausulas",
      titulo: "Garantia",
      clausulas: [
        {
          id: "fiador",
          titulo: "Fiador",
          descricao: "Fixture",
          corpo: body,
          camposExtras: [
            {
              key: "fiador_cpf",
              pergunta: "CPF do fiador:",
              obrigatorio: false,
            },
          ],
        },
      ],
    },
  ],
  template: {
    titulo: "INSTRUMENTO",
    corpo: ["{{clausula:fiador}}"],
  },
});

describe("integridade de cláusulas dinâmicas", () => {
  it("rejeita ids selecionados que não existem no modelo", () => {
    const modelo = modelWithClause("FIADOR: {{fiador_cpf}}.");

    expect(() =>
      reconstructAndValidateResponses(modelo, {}, ["clausula_inventada"])
    ).toThrow(/cláusula/i);
  });

  it("detecta placeholder fantasma dentro do corpo de uma cláusula", () => {
    const modelo = modelWithClause("FIADOR: {{fiador_cpff}}.");
    const errors = validateModel(modelo);

    expect(errors).toContainEqual(
      expect.objectContaining({
        code: "UNREGISTERED_VARIABLE",
        field: "fiador_cpff",
        modelSlug: modelo.slug,
      })
    );
  });

  it("aceita placeholder declarado como campo extra da cláusula", () => {
    const modelo = modelWithClause("FIADOR: {{fiador_cpf}}.");

    expect(validateModel(modelo)).toEqual([]);
  });
});
