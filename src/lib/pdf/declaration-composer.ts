import type { PdfVisualRecipe } from "./visual-recipes";

type PdfNode = Record<string, unknown>;

function isPdfNode(value: unknown): value is PdfNode {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function plainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(plainText).join("");
  if (isPdfNode(value) && "text" in value) return plainText(value.text);
  return "";
}

function removeItalics(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeItalics);
  if (!isPdfNode(value)) return value;

  const next: PdfNode = { ...value };
  if ("italics" in next) next.italics = false;
  if ("text" in next) next.text = removeItalics(next.text);
  return next;
}

function withFirstLineIndent(value: unknown, spaces: number): unknown {
  if (spaces <= 0) return value;

  const runs = Array.isArray(value) ? value : [{ text: String(value ?? "") }];
  const first = runs[0];
  if (isPdfNode(first) && first.preserveLeadingSpaces === true) return runs;

  return [
    {
      text: "\u00a0".repeat(spaces),
      preserveLeadingSpaces: true,
    },
    ...runs,
  ];
}

function isRedundantResidenceSubtitle(text: string): boolean {
  return (
    text.includes("Declaração de residência nos termos da Lei nº 7.115/1983") ||
    text.includes("Declaração firmada sob as penas da lei")
  );
}

function isDirectLegalQuote(text: string): boolean {
  const normalized = text
    .trim()
    .replace(/^["'“”‘’]+\s*/, "")
    .trim();

  return /^(?:art\.?\s*\d+|pena\s*[-:])/i.test(normalized);
}

/**
 * Corrige somente a apresentação da família declaration depois da construção
 * semântica comum. Referências legais dentro de um parágrafo continuam corpo
 * normal; apenas a transcrição literal da lei recebe tratamento de citação.
 */
export function refineDeclarationContent(
  nodes: unknown[],
  recipe: PdfVisualRecipe
): unknown[] {
  const refined: unknown[] = [];
  let discardNextEmpty = false;

  for (const node of nodes) {
    if (!isPdfNode(node)) {
      refined.push(node);
      continue;
    }

    const text = plainText(node).trim();

    if (isRedundantResidenceSubtitle(text)) {
      discardNextEmpty = true;
      continue;
    }

    if (discardNextEmpty && text === "") {
      continue;
    }
    discardNextEmpty = false;

    if (node.style === "legalQuote") {
      if (isDirectLegalQuote(text)) {
        refined.push({
          ...node,
          alignment: "justify" as const,
        });
        continue;
      }

      refined.push({
        ...node,
        text: withFirstLineIndent(removeItalics(node.text), recipe.firstLineIndentSpaces),
        style: "body",
        alignment: "justify" as const,
        margin: [0, 0, 0, recipe.paragraphBottomMargin] as [number, number, number, number],
      });
      continue;
    }

    refined.push(node);
  }

  return refined;
}
