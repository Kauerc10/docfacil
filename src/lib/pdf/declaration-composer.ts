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

function setItalics(value: unknown, italics: boolean): unknown {
  if (Array.isArray(value)) return value.map((item) => setItalics(item, italics));
  if (!isPdfNode(value)) return value;

  const next: PdfNode = { ...value };
  if ("text" in next) {
    next.italics = italics;
    next.text = setItalics(next.text, italics);
  }
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

function isDateParagraph(text: string): boolean {
  const normalized = text.trim();
  return (
    /\[data de assinatura\]/i.test(normalized) ||
    /,\s*\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}/i.test(normalized)
  );
}

function isSignatureContainer(node: PdfNode): boolean {
  if (!Array.isArray(node.stack)) return false;

  return node.stack.some(
    (item) => isPdfNode(item) && (item.style === "signature" || item.style === "witness")
  );
}

function refineTextNode(node: PdfNode, recipe: PdfVisualRecipe): PdfNode {
  const text = plainText(node).trim();
  if (!text || isDateParagraph(text)) return node;

  if (isDirectLegalQuote(text)) {
    return {
      ...node,
      text: setItalics(node.text, true),
      style: "legalQuote",
      alignment: "justify" as const,
      margin: [
        recipe.legalQuoteIndent,
        6,
        recipe.legalQuoteIndent,
        recipe.paragraphBottomMargin,
      ] as [number, number, number, number],
    };
  }

  if (node.style === "legalQuote" || node.style === "body") {
    return {
      ...node,
      text: withFirstLineIndent(
        setItalics(node.text, false),
        recipe.firstLineIndentSpaces
      ),
      style: "body",
      alignment: "justify" as const,
      margin: [0, 0, 0, recipe.paragraphBottomMargin] as [number, number, number, number],
    };
  }

  return node;
}

function refineNestedNode(value: unknown, recipe: PdfVisualRecipe): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => refineNestedNode(item, recipe));
  }
  if (!isPdfNode(value)) return value;

  // O miolo das assinaturas tem alinhamento próprio e não deve herdar o
  // tratamento de parágrafo da declaração.
  if (isSignatureContainer(value)) return value;

  const next: PdfNode = { ...value };

  if (Array.isArray(next.stack)) {
    next.stack = next.stack.map((item) => refineNestedNode(item, recipe));
  }
  if (Array.isArray(next.columns)) {
    next.columns = next.columns.map((item) => refineNestedNode(item, recipe));
  }

  return refineTextNode(next, recipe);
}

/**
 * Normaliza somente a apresentação da família declaration depois da construção
 * semântica comum. O corpo fica justificado e recuado; datas e assinaturas
 * preservam seu alinhamento próprio; apenas transcrições literais de artigo ou
 * pena recebem o tratamento de citação legal.
 */
export function refineDeclarationContent(
  nodes: unknown[],
  recipe: PdfVisualRecipe
): unknown[] {
  const refined: unknown[] = [];
  let discardNextEmpty = false;

  for (const node of nodes) {
    if (!isPdfNode(node)) {
      refined.push(refineNestedNode(node, recipe));
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

    refined.push(refineNestedNode(node, recipe));
  }

  return refined;
}
