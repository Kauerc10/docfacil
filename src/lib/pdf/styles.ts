/**
 * styles.ts — Construção do docDefinition do pdfmake.
 *
 * Single source of truth para pageSize, margens, estilos, identidade e regras
 * de paginação. O conteúdo textual continua vindo do document-engine e a
 * calibração editorial por modelo vive em visual-recipes.ts.
 */
import type { Modelo } from "../types";
import type { GerarPDFOptions } from "./types";
import { applyLegalTitleRule } from "../document-engine/legal-rules";
import { normalizarRespostasLegadasDeContrato } from "../document-engine/legacy-contract-answers";
import {
  buildContent,
  extractClausulasSelecionadas,
  computeCamposOpcionais,
} from "./content-builder";
import { A4_WIDTH, cm, getPdfLayoutGeometry } from "./layout-geometry";
import { buildContractContentForModel } from "./contract-composer";
import {
  getPdfLayoutProfile as resolvePdfLayoutProfile,
  getPdfVisualRecipe,
  type PdfVisualRecipe,
} from "./visual-recipes";

export function getPdfLayoutProfile(modelo: Pick<Modelo, "slug">) {
  return resolvePdfLayoutProfile(modelo);
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

function applyClosingRhythm(nodes: unknown[], recipe: PdfVisualRecipe): unknown[] {
  if (nodes.length === 0) return nodes;

  const out = nodes.map(annotateHeadline);
  const lastIndex = out.length - 1;
  const last = out[lastIndex];

  if (isPdfNode(last) && Array.isArray(last.stack)) {
    out[lastIndex] = {
      ...last,
      margin: [
        0,
        recipe.closingTopMargin,
        0,
        recipe.closingBottomMargin,
      ] as [number, number, number, number],
    };
  }

  return out;
}

export function buildDocDefinition(
  modelo: Modelo,
  respostas: Record<string, string>,
  options?: { watermark?: boolean }
): unknown {
  const respostasCompativeis = normalizarRespostasLegadasDeContrato(modelo, respostas);
  const clausulasSelecionadas = extractClausulasSelecionadas(respostasCompativeis);
  const camposOpcionais = computeCamposOpcionais(
    modelo,
    clausulasSelecionadas,
    respostasCompativeis
  );
  const recipe = getPdfVisualRecipe(modelo);
  const geometry = getPdfLayoutGeometry(recipe);
  const { pageMargins } = geometry;
  const renderedTitle = applyLegalTitleRule(modelo.slug, modelo.template.titulo);
  const contentNodes = recipe.profile === "contract"
    ? buildContractContentForModel(modelo, respostasCompativeis, clausulasSelecionadas, camposOpcionais)
    : applyClosingRhythm(
        buildContent(modelo, respostasCompativeis, clausulasSelecionadas, camposOpcionais),
        recipe
      );
  const dividerWidth = recipe.dividerWidthCm === null ? geometry.contentWidth : cm(recipe.dividerWidthCm);
  const dividerX1 = (geometry.contentWidth - dividerWidth) / 2;
  const dividerX2 = dividerX1 + dividerWidth;
  const footerHorizontalInset = cm(recipe.footerHorizontalInsetCm);
  const footerWidth = A4_WIDTH - 2 * footerHorizontalInset;
  const isFormalContract = recipe.profile === "contract" && recipe.headerStyle === "formal";
  const headingColor = "#14315c";
  const bodyColor = recipe.bodyColor ?? "#0e2340";
  const titleDivider = {
    canvas: [
      {
        type: "line" as const, x1: dividerX1, y1: 0, x2: dividerX2, y2: 0,
        lineWidth: 1.2, lineColor: headingColor,
      },
    ],
    margin: [0, 0, 0, recipe.dividerBottomMargin] as [number, number, number, number],
  };

  return {
    pageSize: "A4" as const,
    pageMargins,
    defaultStyle: {
      font: "Roboto",
      fontSize: recipe.bodyFontSize,
      lineHeight: recipe.bodyLineHeight,
      color: bodyColor,
    },
    background: options?.watermark
      ? () => {
          const cx = geometry.contentWidth / 2;
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
      if (isFormalContract) {
        return {
          margin: [pageMargins[0], cm(0.65), pageMargins[2], 0] as [number, number, number, number],
          stack: [
            {
              columns: [
                {
                  text: [
                    { text: "DocFácil", color: headingColor, bold: true },
                    { text: "  |", color: "#8993a4" },
                  ],
                  style: "headerContinuation",
                },
                {
                  text: "Documentos jurídicos simplificados",
                  color: "#64748b",
                  style: "headerContinuation",
                  alignment: "right" as const,
                },
              ],
            },
            {
              canvas: [
                {
                  type: "line" as const, x1: 0, y1: 5, x2: geometry.frameWidth, y2: 5,
                  lineWidth: 0.7, lineColor: "#b9853d",
                },
              ],
              margin: [0, 2, 0, 0] as [number, number, number, number],
            },
          ],
        };
      }

      if (currentPage > 1) {
        return {
          margin: [pageMargins[0], cm(1.2), pageMargins[2], 0] as [number, number, number, number],
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
                  type: "line" as const, x1: 0, y1: 4, x2: geometry.contentWidth, y2: 4,
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
        margin: [0, 0, 0, recipe.titleBottomMargin] as [number, number, number, number],
      },
      ...(recipe.showTitleDivider === false ? [] : [titleDivider]),
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
      // Footer nativo do pdfmake: usa a faixa física inferior da página e não
      // herda as margens laterais do corpo, como em editores de texto.
      margin: [
        footerHorizontalInset,
        0,
        footerHorizontalInset,
        cm(recipe.footerBottomMarginCm),
      ] as [number, number, number, number],
      stack: [
        {
          canvas: [{
            type: "line" as const, x1: 0, y1: 0, x2: footerWidth, y2: 0,
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
      docTitle: {
        font: "Roboto",
        fontSize: recipe.titleFontSize,
        bold: true,
        color: headingColor,
        characterSpacing: recipe.titleCharacterSpacing,
      },
      sectionHeading: { font: "Roboto", fontSize: 13.5, bold: true, color: headingColor, characterSpacing: 0.5 },
      clauseHeading: { font: "Roboto", fontSize: isFormalContract ? 10.75 : 12, bold: true, color: headingColor },
      body: { font: "Roboto", fontSize: recipe.bodyFontSize, color: bodyColor, lineHeight: recipe.bodyLineHeight },
      label: { font: "Roboto", fontSize: isFormalContract ? 10.5 : 12, bold: true, color: bodyColor },
      signature: {
        font: "Roboto",
        fontSize: 12,
        color: bodyColor,
        lineHeight: recipe.signatureLineHeight,
        characterSpacing: recipe.signatureCharacterSpacing,
      },
      legalQuote: { font: "Roboto", fontSize: 10.5, italics: true, color: "#5a6b82", lineHeight: recipe.legalQuoteLineHeight },
      witness: { font: "Roboto", fontSize: 9.5, italics: true, color: "#5a6b82" },
      headerContinuation: { font: "Roboto", fontSize: 9, color: "#5a6b82" },
      footerText: { font: "Roboto", fontSize: 8, color: "#5a6b82", characterSpacing: 0.3 },
    },
  };
}

export type { GerarPDFOptions };
