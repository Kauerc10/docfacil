import { describe, expect, it } from "bun:test";
import { fillDocument } from "@/lib/document-engine";
import { getModelo } from "@/lib/modelos";
import { renderLineNode } from "@/lib/pdf/content-builder";
import { getPdfVisualRecipe } from "@/lib/pdf/visual-recipes";

function renderDeclaration(slug: string) {
  const modelo = getModelo(slug);
  if (!modelo) throw new Error(`Modelo não encontrado: ${slug}`);

  return fillDocument({
    titulo: modelo.template.titulo,
    corpo: modelo.template.corpo,
    respostas: {},
    clausulasSelecionadas: [],
    modelo,
  }).join("\n");
}

type RenderedNode = {
  style?: string;
  alignment?: string;
  text?: unknown;
};

describe("tipografia formal das declarações", () => {
  it("remove o subtítulo jurídico redundante da autodeclaração renderizada", () => {
    const text = renderDeclaration("declaracao-residencia");

    expect(text).not.toContain("Declaração de residência nos termos da Lei nº 7.115/1983");
    expect(text).not.toContain("Declaração firmada sob as penas da lei");
  });

  it("usa recuo de primeira linha nas duas receitas de declaração", () => {
    const propria = getPdfVisualRecipe({ slug: "declaracao-residencia" });
    const terceiro = getPdfVisualRecipe({ slug: "declaracao-residencia-terceiro" });

    expect(propria.firstLineIndentSpaces).toBeGreaterThanOrEqual(8);
    expect(terceiro.firstLineIndentSpaces).toBeGreaterThanOrEqual(8);
  });

  it("mantém menção ao art. 299 como parágrafo normal justificado", () => {
    const recipe = getPdfVisualRecipe({ slug: "declaracao-residencia-terceiro" });
    const line = "Declaro ainda ter ciência de que a falsidade da presente declaração pode implicar na sanção penal prevista no art. 299 do Código Penal, transcrita abaixo:";
    const rendered = renderLineNode(line, [line], 0, recipe);
    const node = rendered?.element as RenderedNode;

    expect(node.style).toBe("body");
    expect(node.alignment).toBe("justify");
  });

  it("reserva o estilo de citação para a transcrição literal da lei e também a justifica", () => {
    const recipe = getPdfVisualRecipe({ slug: "declaracao-residencia-terceiro" });
    const line = '"Art. 299 - Omitir, em documento público ou particular, declaração que dele devia constar."';
    const rendered = renderLineNode(line, [line], 0, recipe);
    const node = rendered?.element as RenderedNode;

    expect(node.style).toBe("legalQuote");
    expect(node.alignment).toBe("justify");
  });
});
