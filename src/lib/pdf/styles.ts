/**
 * styles.ts — Construção do docDefinition do pdfmake.
 *
 * Single source of truth para toda a aparência do PDF: pageSize, margens,
 * defaultStyle, estilos nomeados (docTitle, sectionHeading, body, etc.),
 * header de continuação, footer e background (carimbo circular).
 *
 * Antes, este objeto era duplicado idêntico em `gerarEBaixarPDF` e
 * `gerarPDFBuffer`. Agora ambas consomem `buildDocDefinition`.
 *
 * Importa `buildContent` + geometria de `./content-builder`.
 */
import type { Modelo } from "../types";
import type { GerarPDFOptions } from "./types";
import {
  buildContent,
  extractClausulasSelecionadas,
  computeCamposOpcionais,
  cm,
  CONTENT_WIDTH,
} from "./content-builder";

/**
 * buildDocDefinition — monta o objeto docDefinition completo para o pdfmake.
 *
 * @param modelo   modelo do documento (template + etapas)
 * @param respostas respostas preenchidas pelo usuário
 * @param options  nome do arquivo + flag de watermark
 * @returns docDefinition pronto para `pdfmake.createPdf()`
 */
export function buildDocDefinition(
  modelo: Modelo,
  respostas: Record<string, string>,
  options?: { watermark?: boolean }
): unknown {
  const clausulasSelecionadas = extractClausulasSelecionadas(respostas);
  const camposOpcionais = computeCamposOpcionais(modelo, clausulasSelecionadas);
  const contentNodes = buildContent(modelo, respostas, clausulasSelecionadas, camposOpcionais);

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return {
    pageSize: "A4" as const,
    pageMargins: [cm(3.15), cm(3.45), cm(3.15), cm(2.6)] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 12,
      lineHeight: 1.6,
      color: "#0e2340",
    },
    // Selo notarial como marca d'água: carimbo circular (círculos concêntricos
    // tracejados + texto "DOCFACIL · VALIDADE LEGAL") via background canvas.
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
                { text: "DOCFACIL", fontSize: 28, bold: true, color: "#2554c7", alignment: "center", characterSpacing: 3, opacity: 0.08 },
                { text: "•", fontSize: 14, color: "#2554c7", alignment: "center", opacity: 0.08, margin: [0, 4, 0, 4] },
                { text: "VALIDADE LEGAL", fontSize: 11, color: "#2554c7", alignment: "center", characterSpacing: 2, opacity: 0.08 },
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
              columns: [
                {
                  text: [
                    { text: "DocFacil", color: "#14315c", bold: true },
                    { text: " · ", color: "#64748b" },
                    { text: modelo.template.titulo, color: "#64748b" },
                  ],
                  style: "headerContinuation",
                  width: "*",
                },
                { text: `Página ${currentPage}`, style: "headerContinuation", width: "auto", alignment: "right" as const },
              ],
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
        text: modelo.template.titulo,
        style: "docTitle",
        alignment: "center" as const,
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      {
        canvas: [
          {
            type: "line" as const, x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0,
            lineWidth: 1.2, lineColor: "#14315c",
          },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      ...contentNodes,
    ],
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
            { text: "Gerado por DocFacil · K-HUB", style: "footerText" },
            { text: `Página ${currentPage} de ${pageCount}`, style: "footerText", alignment: "right" as const },
          ],
          margin: [0, 4, 0, 0] as [number, number, number, number],
        },
      ],
    }),
    styles: {
      // Título: sans-serif bold (hierarquia editorial: serif corpo + sans títulos)
      docTitle: { font: "Roboto", fontSize: 16, bold: true, color: "#14315c", characterSpacing: 1.5 },
      // heading1 (seção principal "1. DAS PARTES"): maior, com respiro
      sectionHeading: { font: "Roboto", fontSize: 13.5, bold: true, color: "#14315c", characterSpacing: 0.5 },
      // heading2 (cláusula): subordinado visualmente
      clauseHeading: { font: "Roboto", fontSize: 12, bold: true, color: "#14315c" },
      body: { font: "Roboto", fontSize: 12, color: "#0e2340", lineHeight: 1.6 },
      label: { font: "Roboto", fontSize: 12, bold: true, color: "#0e2340" },
      signature: { font: "Roboto", fontSize: 12, color: "#0e2340", lineHeight: 1 },
      legalQuote: { font: "Roboto", fontSize: 10.5, italics: true, color: "#5a6b82", lineHeight: 1.5 },
      witness: { font: "Roboto", fontSize: 9.5, italics: true, color: "#5a6b82" },
      headerContinuation: { font: "Roboto", fontSize: 9, color: "#5a6b82" },
      footerText: { font: "Roboto", fontSize: 8, color: "#5a6b82", characterSpacing: 0.3 },
    },
  };
}

/** Re-export para conveniência (callers que precisam de GerarPDFOptions). */
export type { GerarPDFOptions };
