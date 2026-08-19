/**
 * styles.ts — Construção do docDefinition do pdfmake.
 *
 * Single source of truth para pageSize, margens, estilos, identidade e regras
 * de paginação. O conteúdo textual continua vindo do document-engine.
 */
import type { Modelo } from "../types";
import type { GerarPDFOptions } from "./types";
import { applyLegalTitleRule } from "../document-engine/legal-rules";
import {
  buildContent,
  extractClausulasSelecionadas,
  computeCamposOpcionais,
  cm,
  CONTENT_WIDTH,
} from "./content-builder";

type PdfLayoutProfile = "declaration" | "contract" | "instrument";

interface PdfLayoutConfig {
  profile: PdfLayoutProfile;
  pageMargins: [number, number, number, number];
  bodyLineHeight: number;
  signatureLineHeight: number;
  titleBottomMargin: number;
  dividerBottomMargin: number;
  closingTopMargin: number;
}

const DECLARATION_SLUGS = new Set([
  "declaracao-residencia",
  "declaracao-residencia-terceiro",
]);

const INSTRUMENT_SLUGS = new Set([
  "uniao-estavel",
  "procuracao-simples",
]);

export function getPdfLayoutProfile(modelo: Pick<Modelo, "slug">): PdfLayoutProfile {
  if (DECLARATION_SLUGS.has(modelo.slug)) return "declaration";
  if (INSTRUMENT_SLUGS.has(modelo.slug)) return "instrument";
  return "contract";
}

function getLayoutConfig(modelo: Pick<Modelo, "slug">): PdfLayoutConfig {
  const profile = getPdfLayoutProfile(modelo);

  if (profile === "declaration") {
    return {
      profile,
      pageMargins: [cm(3.2), cm(4.0), cm(3.2), cm(2.8)],
      bodyLineHeight: 1.8,
      signatureLineHeight: 1.12,
      titleBottomMargin: 8,
      dividerBottomMargin: 28,
      closingTopMargin: 34,
    };
  }

  if (profile === "instrument") {
    return {
      profile,
      pageMargins: [cm(3.15), cm(3.65), cm(3.15), cm(2.7)],
      bodyLineHeight: 1.68,
      signatureLineHeight: 1.06,
      titleBottomMargin: 6,
      dividerBottomMargin: 24,
      closingTopMargin: 22,
    };
  }

  return {
    profile,
    pageMargins: [cm(3.15), cm(3.45), cm(3.15), cm(2.6)],
    bodyLineHeight: 1.6,
    signatureLineHeight: 1,
    titleBottomMargin: 4,
    dividerBottomMargin: 20,
    closingTopMargin: 15,
  };
}

type PdfNode = Record<string, unknown>;

function isPdfNode(value: unknown): value is PdfNode {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function annotateHeadline(node: unknown): unknown {
  if (!isPdfNode(node)) return node;

  if (node.style === "clauseHeading") {
    return { ...node, headlineLevel: 2 };
  }

  if (Array.isArray(node.columns)) {
    const hasSectionHeading = node.columns.some(
      (column) => isPdfNode(column) && column.style === "sectionHeading"
    );
    if (hasSectionHeading) {
      return { ...node, headlineLevel: 1 };
    }
  }

  return node;
}

function applyClosingRhythm(nodes: unknown[], config: PdfLayoutConfig): unknown[] {
  if (nodes.length === 0) return nodes;

  const out = nodes.map(annotateHeadline);
  const lastIndex = out.length - 1;
  const last = out[lastIndex];

  if (isPdfNode(last) && Array.isArray(last.stack)) {
    out[lastIndex] = {
      ...last,
      margin: [0, config.closingTopMargin, 0, 0] as [number, number, number, number],
    };
  }

  return out;
}

export function buildDocDefinition(
  modelo: Modelo,
  respostas: Record<string, string>,
  options?: { watermark?: boolean }
): unknown {
  const clausulasSelecionadas = extractClausulasSelecionadas(respostas);
  const camposOpcionais = computeCamposOpcionais(modelo, clausulasSelecionadas);
  const layout = getLayoutConfig(modelo);
  const renderedTitle = applyLegalTitleRule(modelo.slug, modelo.template.titulo);
  const contentNodes = applyClosingRhythm(
    buildContent(modelo, respostas, clausulasSelecionadas, camposOpcionais),
    layout
  );

  return {
    pageSize: "A4" as const,
    pageMargins: layout.pageMargins,
    defaultStyle: {
      font: "Roboto",
      fontSize: 12,
      lineHeight: layout.bodyLineHeight,
      color: "#0e2340",
    },
    background: options?.watermark
      ? () => {
          const cx = CONTENT_WIDTH / 2;
          const cy = 350;
          return [
            {
              canvas: [
                { type: "ellipse" as const, x: cx, y: cy, color: "#2554c7", lineWidth: 2.5, fillOpacity: 0, opacity: 0.08, r1: 130, r2: 130 },
                { type: "ellipse" as const, x: cx, y: cy, color: "#2554c7", lineWidth: 1, dash: { length: 5, space: 4 }, fillOpacity: 0, opacity: 0.08, r1: 112, r2: 112 },
              ],
              opacity: 0.08,
            },
            {
              stack: [
                { text: "DOCFÁCIL", fontSize: 28, bold: true, color: "#2554c7", alignment: "center", characterSpacing: 3, opacity: 0.08 },
                { text: "•", fontSize: 14, color: "#2554c7", alignment: "center", opacity: 0.08, margin: [0, 4, 0, 4] },
                { text: "DOCUMENTO GERADO", fontSize: 10, color: "#2554c7", alignment: "center", characterSpacing: 1.6, opacity: 0.08 },
              ],
              alignment: "center",
              margin: [cx - 90, cy - 28, 0, 0] as [number, number, number, number],
              opacity: 0.08,
            },
          ];
        }
      : undefined,
    header: (currentPage: number) => {
      if (currentPage > 1) {
        return {
          margin: [cm(3.15), cm(1.2), cm(3.15), 0] as [number, number, number, number],
          stack: [
            {
              text: [
                { text: "DocFácil", color: "#14315c", bold: true },
                { text: " · ", color: "#64748b" },
                { text: renderedTitle, color: "#64748b" },
              ],
              style: "headerContinuation",
            },
            {
              canvas: [
                {
                  type: "line" as const, x1: 0, y1: 4, x2: CONTENT_WIDTH, y2: 4,
                  lineWidth: 0.8, lineColor: "#cbd5e1",
                },
              ],
              margin: [0, 2, 0, 0] as [number, number, number, number],
            },
          ],
        };
      }
      return null;
    },
    content: [
      {
        text: renderedTitle,
        style: "docTitle",
        alignment: "center" as const,
        margin: [0, 0, 0, layout.titleBottomMargin] as [number, number, number, number],
      },
      {
        canvas: [
          {
            type: "line" as const, x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0,
            lineWidth: 1.2, lineColor: "#14315c",
          },
        ],
        margin: [0, 0, 0, layout.dividerBottomMargin] as [number, number, number, number],
      },
      ...contentNodes,
    ],
    pageBreakBefore: (
      currentNode: { headlineLevel?: number },
      followingNodesOnPage: unknown[]
    ) => Boolean(
      currentNode?.headlineLevel &&
      Array.isArray(followingNodesOnPage) &&
      followingNodesOnPage.length === 0
    ),
    footer: (currentPage: number, pageCount: number) => ({
      margin: [cm(3.15), 0, cm(3.15), cm(1.0)] as [number, number, number, number],
      stack: [
        {
          canvas: [{
            type: "line" as const, x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0,
            lineWidth: 0.6, lineColor: "#cbd5e1",
          }],
        },
        {
          columns: [
            { text: "Gerado por DocFácil", style: "footerText" },
            { text: `Página ${currentPage} de ${pageCount}`, style: "footerText", alignment: "right" as const },
          ],
          margin: [0, 4, 0, 0] as [number, number, number, number],
        },
      ],
    }),
    styles: {
      docTitle: { font: "Roboto", fontSize: layout.profile === "declaration" ? 16.5 : 16, bold: true, color: "#14315c", characterSpacing: 1.5 },
      sectionHeading: { font: "Roboto", fontSize: 13.5, bold: true, color: "#14315c", characterSpacing: 0.5 },
      clauseHeading: { font: "Roboto", fontSize: 12, bold: true, color: "#14315c" },
      body: { font: "Roboto", fontSize: layout.profile === "declaration" ? 12.25 : 12, color: "#0e2340", lineHeight: layout.bodyLineHeight },
      label: { font: "Roboto", fontSize: 12, bold: true, color: "#0e2340" },
      signature: { font: "Roboto", fontSize: 12, color: "#0e2340", lineHeight: layout.signatureLineHeight },
      legalQuote: { font: "Roboto", fontSize: 10.5, italics: true, color: "#5a6b82", lineHeight: layout.profile === "declaration" ? 1.6 : 1.5 },
      witness: { font: "Roboto", fontSize: 9.5, italics: true, color: "#5a6b82" },
      headerContinuation: { font: "Roboto", fontSize: 9, color: "#5a6b82" },
      footerText: { font: "Roboto", fontSize: 8, color: "#5a6b82", characterSpacing: 0.3 },
    },
  };
}

export type { GerarPDFOptions };
