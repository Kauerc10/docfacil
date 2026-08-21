import {
  classifyLine,
  fillDocument,
  normalizarRespostasLegadasDeContrato,
} from "../document-engine";
import type { Modelo } from "../types";
import {
  computeCamposOpcionais,
  extractClausulasSelecionadas,
  findClosingSectionIndex,
  textRuns,
} from "./content-builder";
import { getPdfLayoutGeometry } from "./layout-geometry";
import { getPdfVisualRecipe, type PdfVisualRecipe } from "./visual-recipes";

type PdfNode = Record<string, unknown>;

interface SignatureBlock {
  details: string[];
}

const WITNESS_COLUMN_WEIGHTS = [18, 154, 43, 98, 33, 70] as const;
const WITNESS_TOTAL_WEIGHT = WITNESS_COLUMN_WEIGHTS.reduce((sum, weight) => sum + weight, 0);

function isDateLine(text: string): boolean {
  return /\[data de assinatura\]|(?:,|\s)\s*\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}/i.test(text);
}

function renderContractLine(line: string, recipe: PdfVisualRecipe): PdfNode | null {
  const classified = classifyLine(line);

  if (classified.tipo === "empty") return null;

  if (classified.tipo === "heading1") {
    return {
      text: classified.texto,
      style: "sectionHeading",
      headlineLevel: 1,
      margin: [0, 16, 0, 7],
    };
  }

  if (classified.tipo === "heading2") {
    return {
      text: classified.texto,
      style: "clauseHeading",
      headlineLevel: 2,
      margin: [0, recipe.clauseHeadingTopMargin, 0, recipe.clauseHeadingBottomMargin],
    };
  }

  if (classified.texto.startsWith("(") && classified.texto.endsWith(")")) {
    return {
      text: textRuns(classified.texto, { italics: true }),
      style: "body",
      alignment: "center",
      margin: [0, 0, 0, recipe.paragraphBottomMargin + 5],
    };
  }

  const colonMatch = classified.texto.match(/^([A-ZÀ-Ú][A-ZÀ-Ú\s/()]+):\s*(.+)$/);
  if (colonMatch && colonMatch[1].length < 40) {
    return {
      text: [{ text: `${colonMatch[1]}: `, style: "label" }, ...textRuns(colonMatch[2])],
      style: "body",
      alignment: "justify",
      margin: [0, 0, 0, recipe.paragraphBottomMargin],
    };
  }

  return {
    text: textRuns(classified.texto),
    style: "body",
    alignment: "justify",
    margin: [0, 0, 0, recipe.paragraphBottomMargin],
  };
}

function signatureCell(block: SignatureBlock, width: number): PdfNode {
  const lineInset = 12;

  return {
    stack: [
      {
        canvas: [{
          type: "line",
          x1: lineInset,
          y1: 8,
          x2: Math.max(lineInset, width - lineInset),
          y2: 8,
          lineWidth: 0.65,
          lineColor: "#334155",
        }],
        margin: [0, 0, 0, 3],
      },
      ...block.details.map((detail, index) => ({
        text: textRuns(detail),
        style: "body",
        alignment: "center",
        bold: index === 0,
        margin: [0, 0, 0, index === block.details.length - 1 ? 0 : 2],
      })),
    ],
    margin: [0, 0, 0, 0],
  };
}

const gridLayout = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

function buildSignatureGrid(blocks: SignatureBlock[], contentWidth: number): PdfNode | null {
  if (blocks.length === 0) return null;

  const columnWidth = contentWidth / 2;
  const rows: PdfNode[][] = [];
  for (let index = 0; index < blocks.length; index += 2) {
    const pair = blocks.slice(index, index + 2);
    rows.push(pair.length === 2
      ? [signatureCell(pair[0], columnWidth), signatureCell(pair[1], columnWidth)]
      : [signatureCell(pair[0], columnWidth), { text: "" }]);
  }

  return {
    table: {
      widths: [columnWidth, columnWidth],
      dontBreakRows: true,
      body: rows,
    },
    layout: gridLayout,
    margin: [0, 13, 0, 9],
  };
}

function buildWitnessGrid(rows: string[], contentWidth: number): PdfNode | null {
  if (rows.length === 0) return null;

  const widths = WITNESS_COLUMN_WEIGHTS.map(
    (weight) => contentWidth * weight / WITNESS_TOTAL_WEIGHT
  );
  const lineWidth = (columnIndex: number) => Math.max(0, widths[columnIndex] - 2);

  return {
    stack: [
      { text: "TESTEMUNHAS:", style: "body", bold: true, margin: [0, 2, 0, 5] },
      ...rows.map((line, index) => ({
        table: {
          widths,
          dontBreakRows: true,
          body: [[
            { text: `${line.match(/^(\d+)\)/)?.[1] ?? index + 1})`, style: "body" },
            { canvas: [{ type: "line", x1: 0, y1: 8, x2: lineWidth(1), y2: 8, lineWidth: 0.55, lineColor: "#334155" }] },
            { text: "Nome:", style: "body", alignment: "right" },
            { canvas: [{ type: "line", x1: 0, y1: 8, x2: lineWidth(3), y2: 8, lineWidth: 0.55, lineColor: "#334155" }] },
            { text: "CPF:", style: "body", alignment: "right" },
            { canvas: [{ type: "line", x1: 0, y1: 8, x2: lineWidth(5), y2: 8, lineWidth: 0.55, lineColor: "#334155" }] },
          ]],
        },
        layout: gridLayout,
        margin: [0, 0, 0, 8],
      })),
    ],
  };
}

function buildClosing(lines: string[], recipe: PdfVisualRecipe): PdfNode {
  const intro: PdfNode[] = [];
  const signatures: SignatureBlock[] = [];
  const witnesses: string[] = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const classified = classifyLine(line);

    if (classified.tipo === "empty") {
      index++;
      continue;
    }

    if (/^TESTEMUNHAS:\s*$/i.test(line.trim())) {
      index++;
      continue;
    }

    if (/^e,?\s+por\s+(?:estarem|assim)/i.test(classified.texto)) {
      intro.push({
        text: textRuns(classified.texto),
        style: "body",
        alignment: "justify",
        margin: [0, 0, 0, recipe.paragraphBottomMargin],
      });
      index++;
      continue;
    }

    if (/^\d+\)\s*_{3,}/.test(classified.texto)) {
      witnesses.push(classified.texto);
      index++;
      continue;
    }

    if (classified.tipo === "signature") {
      const details: string[] = [];
      index++;
      while (index < lines.length) {
        const next = classifyLine(lines[index]);
        if (next.tipo === "empty") {
          index++;
          break;
        }
        if (next.tipo !== "paragraph") break;
        details.push(next.texto);
        index++;
      }
      signatures.push({ details });
      continue;
    }

    if (classified.tipo === "witness") {
      if (!/^testemunhas?:?$/i.test(classified.texto)) witnesses.push(classified.texto);
      index++;
      continue;
    }

    intro.push({
      text: textRuns(classified.texto),
      style: "body",
      alignment: isDateLine(classified.texto) ? "center" : "justify",
      margin: isDateLine(classified.texto)
        ? [0, recipe.dateTopMargin, 0, recipe.dateBottomMargin]
        : [0, 0, 0, recipe.paragraphBottomMargin],
    });
    index++;
  }

  const { contentWidth } = getPdfLayoutGeometry(recipe);
  const signatureGrid = buildSignatureGrid(signatures, contentWidth);
  const witnessGrid = buildWitnessGrid(witnesses, contentWidth);

  return {
    id: "contract-closing",
    stack: [...intro, ...(signatureGrid ? [signatureGrid] : []), ...(witnessGrid ? [witnessGrid] : [])],
    margin: [0, recipe.closingTopMargin, 0, recipe.closingBottomMargin],
  };
}

export function buildContractContent(lines: string[], recipe: PdfVisualRecipe): PdfNode[] {
  const closingIndex = findClosingSectionIndex(lines);
  const bodyLines = closingIndex === -1 ? lines : lines.slice(0, closingIndex);
  const closingLines = closingIndex === -1 ? [] : lines.slice(closingIndex);
  const content = bodyLines
    .map((line) => renderContractLine(line, recipe))
    .filter((node): node is PdfNode => node !== null);

  if (closingLines.length > 0) content.push(buildClosing(closingLines, recipe));
  return content;
}

export function buildContractContentForModel(
  modelo: Modelo,
  respostas: Record<string, string>,
  clausulasSelecionadas?: string[],
  camposOpcionais?: string[]
): PdfNode[] {
  const respostasCompativeis = normalizarRespostasLegadasDeContrato(modelo, respostas);
  const clausulasCompativeis = clausulasSelecionadas
    ?? extractClausulasSelecionadas(respostasCompativeis);
  const camposOpcionaisCompativeis = camposOpcionais
    ?? computeCamposOpcionais(modelo, clausulasCompativeis, respostasCompativeis);
  const lines = fillDocument(
    {
      titulo: modelo.template.titulo,
      corpo: modelo.template.corpo,
      respostas: respostasCompativeis,
      clausulasSelecionadas: clausulasCompativeis,
      modelo,
    },
    { camposOpcionais: camposOpcionaisCompativeis }
  ).slice(1);
  return buildContractContent(lines, getPdfVisualRecipe(modelo));
}
