import { describe, expect, it } from "bun:test";
import {
  getModels,
  getModel,
  getModelsByCategory,
  searchModels,
  resolveModel,
} from "@/lib/services/models-service";
import { MODELOS } from "@/lib/modelos";

describe("Models Service (Code-as-Source-of-Truth)", () => {
  it("returns all platform models sorted by popular first then alphabetical", async () => {
    const models = await getModels();
    expect(models.length).toBe(MODELOS.length);
    expect(models.length).toBeGreaterThanOrEqual(5);

    // O primeiro modelo deve ser popular
    expect(models[0].popular).toBe(true);
  });

  it("finds a model by slug correctly", async () => {
    const model = await getModel("declaracao-residencia");
    expect(model).not.toBeNull();
    expect(model?.slug).toBe("declaracao-residencia");
    expect(model?.nome).toContain("Residência");

    const nonExistent = await getModel("modelo-que-nao-existe");
    expect(nonExistent).toBeNull();
  });

  it("filters models by category", async () => {
    const locacao = await getModelsByCategory("Locação");
    expect(locacao.length).toBeGreaterThanOrEqual(1);
    for (const m of locacao) {
      expect(m.categoria).toBe("Locação");
    }
  });

  it("searches models by keyword", async () => {
    const results = await searchModels("locação");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((m) => m.slug.includes("locacao"))).toBe(true);
  });

  it("resolves official platform models and custom/AI templates", async () => {
    // 1. Modelo oficial
    const official = await resolveModel("declaracao-residencia");
    expect(official).not.toBeNull();
    expect(official?.slug).toBe("declaracao-residencia");

    // 2. Modelo customizado/AI simulado
    const customTemplate = {
      slug: "ai:nda-personalizado",
      nome: "NDA Personalizado por IA",
      desc: "Acordo de confidencialidade gerado dinamicamente",
      quandoUsar: "Para parcerias",
      categoria: "Comercial" as const,
      minutos: 2,
      icone: "seal" as const,
      campos: [],
      template: {
        titulo: "ACORDO DE CONFIDENCIALIDADE",
        corpo: ["Texto do acordo"],
      },
    };

    const resolvedCustom = await resolveModel("ai:nda-personalizado", {
      customTemplates: {
        "ai:nda-personalizado": customTemplate,
      },
    });

    expect(resolvedCustom).not.toBeNull();
    expect(resolvedCustom?.nome).toBe("NDA Personalizado por IA");
  });
});
