import { describe, expect, it } from "bun:test";
import { classifyLine } from "@/lib/document-engine/classify";
import { getModelo } from "@/lib/modelos";
import { buildDocDefinition } from "@/lib/pdf/styles";
import { getPdfVisualRecipe } from "@/lib/pdf/visual-recipes";

type PdfNode = {
  text?: unknown;
  style?: string;
  alignment?: string;
  [key: string]: unknown;
};

function plainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(plainText).join("");
  if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    if ("text" in node) return plainText(node.text);
  }
  return "";
}

function findStyledNode(value: unknown, fragment: string): PdfNode | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStyledNode(item, fragment);
      if (found) return found;
    }
    return undefined;
  }

  if (!value || typeof value !== "object") return undefined;

  const node = value as PdfNode;
  if (typeof node.style === "string" && plainText(node).includes(fragment)) {
    return node;
  }

  for (const child of Object.values(node)) {
    const found = findStyledNode(child, fragment);
    if (found) return found;
  }

  return undefined;
}

function buildDeclaration(slug: string): PdfNode[] {
  const modelo = getModelo(slug);
  if (!modelo) throw new Error(`Modelo não encontrado: ${slug}`);

  const ddo = buildDocDefinition(modelo, {}) as { content: PdfNode[] };
  return ddo.content;
}

describe("tipografia formal das declarações", () => {
  it("remove o subtítulo jurídico redundante da autodeclaração no PDF final", () => {
    const content = buildDeclaration("declaracao-residencia");
    const text = content.map(plainText).join("\n");

    expect(text).not.toContain("Declaração de residência nos termos da Lei nº 7.115/1983");
    expect(text).not.toContain("Declaração firmada sob as penas da lei");
  });

  it("não confunde campos ainda vazios dentro do texto com linha de assinatura", () => {
    expect(classifyLine("Eu, ____________, declaro que ____________ reside neste endereço.").tipo).toBe("paragraph");
    expect(classifyLine("_______________________________________________").tipo).toBe("signature");
  });

  it("usa recuo de primeira linha nas duas receitas de declaração", () => {
    const propria = getPdfVisualRecipe({ slug: "declaracao-residencia" });
    const terceiro = getPdfVisualRecipe({ slug: "declaracao-residencia-terceiro" });

    expect(propria.firstLineIndentSpaces).toBeGreaterThanOrEqual(8);
    expect(terceiro.firstLineIndentSpaces).toBeGreaterThanOrEqual(8);
  });

  it("mantém menção ao art. 299 como parágrafo normal justificado e recuado", () => {
    const content = buildDeclaration("declaracao-residencia-terceiro");
    const node = findStyledNode(content, "falsidade da presente declaração");

    expect(node).toBeDefined();
    expect(node?.style).toBe("body");
    expect(node?.alignment).toBe("justify");

    const runs = Array.isArray(node?.text) ? node.text as Record<string, unknown>[] : [];
    expect(runs[0]?.preserveLeadingSpaces).toBe(true);
  });

  it("reserva o estilo de citação para a transcrição literal da lei e também a justifica", () => {
    const content = buildDeclaration("declaracao-residencia-terceiro");
    const node = findStyledNode(content, "Art. 299 - Omitir");

    expect(node).toBeDefined();
    expect(node?.style).toBe("legalQuote");
    expect(node?.alignment).toBe("justify");
  });
});
