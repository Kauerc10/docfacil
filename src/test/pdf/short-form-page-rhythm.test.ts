import { describe, expect, it } from "bun:test";
import { getModelo } from "@/lib/modelos";
import { getPdfVisualRecipe } from "@/lib/pdf/visual-recipes";

const shortFormSlugs = [
  "declaracao-residencia",
  "declaracao-residencia-terceiro",
  "uniao-estavel",
  "procuracao-simples",
] as const;

describe("ritmo editorial dos documentos curtos", () => {
  it("evita uma caixa de texto larga demais em peças de uma página", () => {
    for (const slug of shortFormSlugs) {
      const modelo = getModelo(slug);
      expect(modelo).toBeDefined();

      const recipe = getPdfVisualRecipe(modelo!);
      expect(recipe.profile).not.toBe("contract");
      expect(recipe.pageMarginsCm[0]).toBeGreaterThanOrEqual(2.3);
      expect(recipe.pageMarginsCm[2]).toBeGreaterThanOrEqual(2.3);
    }
  });

  it("dá corpo tipográfico suficiente para ocupar a folha sem inflar artificialmente a assinatura", () => {
    for (const slug of shortFormSlugs) {
      const recipe = getPdfVisualRecipe(getModelo(slug)!);

      expect(recipe.bodyFontSize).toBeGreaterThanOrEqual(11.5);
      expect(recipe.bodyLineHeight).toBeGreaterThanOrEqual(1.5);
      expect(recipe.signatureLineHeight).toBeLessThanOrEqual(1.1);
    }
  });

  it("empurra o conteúdo útil um pouco para baixo e distribui o fechamento com respiro", () => {
    for (const slug of shortFormSlugs) {
      const recipe = getPdfVisualRecipe(getModelo(slug)!);

      expect(recipe.pageMarginsCm[1]).toBeGreaterThanOrEqual(2.5);
      expect(recipe.titleBottomMargin).toBeGreaterThanOrEqual(9);
      expect(recipe.closingTopMargin).toBeGreaterThanOrEqual(16);
    }
  });

  it("mantém as declarações mais arejadas na data e na assinatura", () => {
    for (const slug of ["declaracao-residencia", "declaracao-residencia-terceiro"] as const) {
      const recipe = getPdfVisualRecipe(getModelo(slug)!);

      expect(recipe.dateAlignment).toBe("center");
      expect(recipe.dateTopMargin).toBeGreaterThanOrEqual(20);
      expect(recipe.dateBottomMargin).toBeGreaterThanOrEqual(28);
      expect(recipe.paragraphBottomMargin).toBeGreaterThanOrEqual(10);
    }
  });
});
