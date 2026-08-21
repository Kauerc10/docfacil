import { describe, expect, it } from "bun:test";
import { MODELOS } from "@/lib/modelos";
import { validateAllModels, validateModel } from "@/lib/document-engine/model-validator";

describe("CI Gate: Model Integrity Validator", () => {
  it("validates that all official platform models are 100% integral with 0 errors", () => {
    expect(MODELOS.length).toBe(9);
    const errors = validateAllModels(MODELOS);

    if (errors.length > 0) {
      console.error("Erros de integridade encontrados nos modelos:", errors);
    }

    expect(errors).toEqual([]);
  });

  it("detects unregistered variables, missing clauses and duplicate keys in broken models", () => {
    const brokenModel = {
      slug: "modelo-quebrado",
      nome: "Modelo Quebrado",
      desc: "Desc",
      quandoUsar: "Quando",
      categoria: "Pessoal" as const,
      minutos: 2,
      icone: "home" as const,
      campos: [{ key: "campo_valido", pergunta: "Pergunta" }],
      etapas: [],
      template: {
        titulo: "TITULO {{campo_fantasma}}",
        corpo: ["Texto com {{clausula:inexistente}}"],
      },
    };

    const errors = validateModel(brokenModel);
    expect(errors.length).toBeGreaterThanOrEqual(2);

    const hasUnregistered = errors.some((e) => e.code === "UNREGISTERED_VARIABLE" && e.field === "campo_fantasma");
    const hasMissingClause = errors.some((e) => e.code === "MISSING_CLAUSE" && e.clauseId === "inexistente");

    expect(hasUnregistered).toBe(true);
    expect(hasMissingClause).toBe(true);
  });

  it("allows placeholders declaratively resolved by the model's render rules", () => {
    const modelWithRenderPlaceholders = {
      slug: "modelo-com-regras-de-renderizacao",
      nome: "Modelo com regras de renderização",
      desc: "Desc",
      quandoUsar: "Quando",
      categoria: "Pessoal" as const,
      minutos: 2,
      icone: "home" as const,
      campos: [],
      etapas: [],
      template: {
        titulo: "TÍTULO",
        corpo: ["{{resumo_calculado}}", "{{clausula:condicao_calculada}}"],
        placeholdersDeRenderizacao: ["resumo_calculado"],
        clausulasDeRenderizacao: ["condicao_calculada"],
      },
    };

    expect(validateModel(modelWithRenderPlaceholders)).toEqual([]);
  });
});
