/**
 * PDF generation with pdfmake 0.3+.
 *
 * Produces um PDF A4 profissional baseado nos modelos de referência:
 * - Título centralizado em negrito
 * - Parágrafos justificados com espaçamento adequado
 * - Detecção automática de cláusulas (CLÁUSULA PRIMEIRA – DO OBJETO) → bold
 * - Detecção de seções numeradas (1. DAS PARTES) → bold
 * - Labels (LOCADOR:, LOCATÁRIO:) em bold inline
 * - Citações legais (art. 299 CP) em itálico
 * - Assinaturas preservadas do template
 * - Footer limpo: "Gerado por DocFacil" + data + página X/Y
 * - Sem marca d'água grande (documentos limpos e profissionais)
 */
import type { Modelo } from "../types";

type PdfMakeModule = typeof import("pdfmake/build/pdfmake");
type PdfMakeContext = {
  createPdf: (docDefinition: unknown) => { download: (filename: string) => void };
};

let pdfmakePromise: Promise<PdfMakeContext> | null = null;

async function loadPdfmake(): Promise<PdfMakeContext> {
  if (!pdfmakePromise) {
    pdfmakePromise = (async () => {
      const mod = (await import("pdfmake/build/pdfmake")) as unknown as PdfMakeModule;
      const vfs = (await import("pdfmake/build/vfs_fonts")).default as unknown as Record<string, string>;

      // Next.js / ESM freezes the module namespace, so addFonts() (which
      // does this.fonts = ...) throws. Fix: create a mutable context object
      // with all properties createPdf() needs, and bind the methods to it.
      mod.addVirtualFileSystem(vfs);

      const ctx = {
        fonts: mod.fonts, // already has Roboto by default
        virtualfs: mod.virtualfs,
        urlAccessPolicy: mod.urlAccessPolicy,
        localAccessPolicy: mod.localAccessPolicy,
        tableLayouts: (mod as unknown as { tableLayouts?: unknown }).tableLayouts,
        progressCallback: (mod as unknown as { progressCallback?: unknown }).progressCallback,
      };

      const createPdf = mod.createPdf.bind(ctx) as (docDefinition: unknown) => { download: (filename: string) => void };
      const _transformToDocument = (mod as unknown as { _transformToDocument: (p: unknown) => { download: (f: string) => void } })._transformToDocument.bind(ctx);
      (ctx as unknown as { _transformToDocument: unknown })._transformToDocument = _transformToDocument;

      return { createPdf };
    })();
  }
  return pdfmakePromise;
}

// === Parser de linhas ===

type ContentNode =
  | { type: "heading1"; text: string }
  | { type: "heading2"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "empty" }
  | { type: "signature"; text: string }
  | { type: "witness"; text: string };

function parseLine(linha: string): ContentNode {
  const trimmed = linha.trim();
  if (!trimmed) return { type: "empty" };

  // Heading 1: "1. DAS PARTES" (numeração + MAIÚSCULAS)
  if (/^\d+\.\s+[A-ZÀ-Ú]/.test(trimmed) && trimmed === trimmed.toUpperCase()) {
    return { type: "heading1", text: trimmed };
  }

  // Heading 2: "Cláusula Primeira:", "Cláusula de Multa:", "CLÁUSULA PRIMEIRA –"
  if (/^Cláusula(\s+\w+)?:/i.test(trimmed) || /^CLÁUSULA\s+/i.test(trimmed)) {
    return { type: "heading2", text: trimmed };
  }

  // Linha de assinatura (underscores)
  if (/_{5,}/.test(trimmed)) {
    return { type: "signature", text: trimmed };
  }

  // Observação / testemunha
  if (/^OBSERVAÇÃO|^RECONHECIMENTO|^TESTEMUNHA/i.test(trimmed)) {
    return { type: "witness", text: trimmed };
  }

  return { type: "paragraph", text: trimmed };
}

// === Preenchimento de template ===

function fillTemplate(
  template: string,
  respostas: Record<string, string>,
  modelo: Modelo
): string {
  let result = template;

  // {{clausula:X}}
  result = result.replace(/\{\{clausula:(\w+)\}\}/g, (_, key: string) => {
    const marcada = respostas[`__clausula_${key}`] === "true";
    if (!marcada) return "";
    for (const etapa of (modelo as unknown as { etapas?: Array<{ tipo: string; clausulas?: Array<{ key: string; textoClausula: string }> }> }).etapas || []) {
      if (etapa.tipo !== "clausulas") continue;
      const clausula = etapa.clausulas?.find((c) => c.key === key);
      if (clausula) {
        return clausula.textoClausula.replace(/\{\{(\w+)\}\}/g, (_m2: string, k2: string) =>
          respostas[k2] && respostas[k2].trim() ? respostas[k2] : "______"
        );
      }
    }
    return "";
  });

  // {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = respostas[key];
    if (v && v.trim()) return v;
    if (/complemento|rg/i.test(key)) return "";
    return "______________________";
  });

  result = result.replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",");
  return result;
}

// === Build content ===

function buildContent(corpoPreenchido: string[]): unknown[] {
  const content: unknown[] = [];
  const nodes = corpoPreenchido.map(parseLine);

  for (const node of nodes) {
    if (node.type === "empty") {
      content.push({ text: "", margin: [0, 4] });
      continue;
    }

    if (node.type === "heading1") {
      content.push({
        text: node.text,
        style: "sectionHeading",
        margin: [0, 12, 0, 4],
      });
      continue;
    }

    if (node.type === "heading2") {
      content.push({
        text: node.text,
        style: "clauseHeading",
        margin: [0, 8, 0, 3],
      });
      continue;
    }

    if (node.type === "signature") {
      content.push({
        text: node.text,
        style: "signature",
        margin: [0, 4, 0, 2],
      });
      continue;
    }

    if (node.type === "witness") {
      content.push({
        text: node.text,
        style: "witness",
        margin: [0, 8, 0, 4],
      });
      continue;
    }

    // Parágrafo
    if (node.type === "paragraph") {
      // Citação legal (entre aspas, contendo "Art." ou "Pena")
      if (node.text.startsWith('"') && (node.text.includes("Art.") || node.text.includes("Pena"))) {
        content.push({
          text: node.text,
          style: "legalQuote",
          margin: [20, 4, 20, 8],
        });
        continue;
      }

      // Label: "LOCADOR:" em bold
      const colonMatch = node.text.match(/^([A-ZÀ-Ú][A-ZÀ-Ú\s/()]+):\s*(.+)$/);
      if (colonMatch && colonMatch[1].length < 40) {
        content.push({
          text: [
            { text: colonMatch[1] + ": ", style: "label" },
            { text: colonMatch[2], style: "body" },
          ],
          margin: [0, 0, 0, 6],
          alignment: "justify",
        });
      } else {
        content.push({
          text: node.text,
          style: "body",
          margin: [0, 0, 0, 6],
          alignment: "justify",
        });
      }
    }
  }

  return content;
}

// === Geração ===

export async function gerarEBaixarPDF(
  modelo: Modelo,
  respostas: Record<string, string>,
  nomeArquivo?: string
): Promise<void> {
  const pdfmake = await loadPdfmake();

  const corpoPreenchido = modelo.template.corpo
    .map((linha) => fillTemplate(linha, respostas, modelo))
    .filter((linha, i) => {
      const original = modelo.template.corpo[i];
      if (/\{\{clausula:/.test(original) && !linha.trim()) return false;
      return true;
    });

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const contentNodes = buildContent(corpoPreenchido);

  const docDefinition = {
    pageSize: "A4" as const,
    pageMargins: [72, 90, 72, 72],
    defaultStyle: {
      font: "Roboto",
      fontSize: 11,
      lineHeight: 1.45,
      color: "#0E2340",
    },
    header: (currentPage: number) => {
      if (currentPage > 1) {
        return {
          margin: [72, 36, 72, 0],
          stack: [
            {
              columns: [
                { text: modelo.template.titulo, style: "headerContinuation" },
                { text: `pág. ${currentPage}`, style: "headerContinuation", alignment: "right" },
              ],
            },
            {
              canvas: [{
                type: "line", x1: 0, y1: 4, x2: 451, y2: 4,
                lineWidth: 0.5, lineColor: "#E6DCCB",
              }],
              margin: [0, 2, 0, 0],
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
        alignment: "center",
        margin: [0, 0, 0, 4],
      },
      {
        canvas: [{
          type: "line", x1: 0, y1: 0, x2: 451, y2: 0,
          lineWidth: 1.5, lineColor: "#14315C",
        }],
        margin: [0, 0, 0, 20],
      },
      ...contentNodes,
    ],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [72, 0, 72, 28],
      stack: [
        {
          canvas: [{
            type: "line", x1: 0, y1: 0, x2: 451, y2: 0,
            lineWidth: 0.5, lineColor: "#E6DCCB",
          }],
        },
        {
          columns: [
            { text: "Gerado por DocFacil", style: "footerText" },
            { text: `${dataHoje} — pág. ${currentPage}/${pageCount}`, style: "footerText", alignment: "right" },
          ],
          margin: [0, 4, 0, 0],
        },
      ],
    }),
    styles: {
      docTitle: { font: "Roboto", fontSize: 16, bold: true, color: "#0E2340" },
      sectionHeading: { font: "Roboto", fontSize: 12, bold: true, color: "#14315C" },
      clauseHeading: { font: "Roboto", fontSize: 11, bold: true, color: "#0E2340" },
      body: { font: "Roboto", fontSize: 11, color: "#0E2340", lineHeight: 1.45 },
      label: { font: "Roboto", fontSize: 11, bold: true, color: "#14315C" },
      signature: { font: "Roboto", fontSize: 10, color: "#0E2340" },
      legalQuote: { font: "Roboto", fontSize: 10, italics: true, color: "#5A6B82", lineHeight: 1.4 },
      witness: { font: "Roboto", fontSize: 9, italics: true, color: "#5A6B82" },
      headerContinuation: { font: "Roboto", fontSize: 9, color: "#8A8A8A" },
      footerText: { font: "Roboto", fontSize: 8, color: "#8A8A8A" },
    },
    // Sem marca d'água — documentos limpos e profissionais
  };

  const nome = nomeArquivo || `${modelo.slug}-${dataHoje.replace(/\//g, "-")}`;
  pdfmake.createPdf(docDefinition).download(`${nome}.pdf`);
}

export async function preloadPdfmake(): Promise<void> {
  await loadPdfmake();
}
