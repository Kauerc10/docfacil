/**
 * PDF generation with pdfmake 0.3+.
 *
 * Produz um PDF A4 profissional usando o motor em `lib/document-engine/`
 * (single source of truth para preenchimento + classificação). Mudou alguma
 * regra de renderização? Muda no motor, todos os renderers (PreviewA4,
 * DetalhePreview, PDF) acompanham automaticamente.
 *
 * Features:
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
import {
  fillDocument,
  classifyLine,
  extractClausulasSelecionadas,
} from "../document-engine";
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

// === Build content via motor (single source of truth) =====================

/**
 * Constrói o array de conteúdo pdfmake a partir de um modelo + respostas +
 * cláusulas selecionadas. Usa o motor em `lib/document-engine/` para:
 *   1. Preencher o template (cláusulas + endereços + separadores RG)
 *   2. Classificar cada linha (heading1/2, paragraph, signature, witness, empty)
 *
 * Depois mapeia cada classificação para o estilo pdfmake correspondente.
 */
function buildContent(
  modelo: Modelo,
  respostas: Record<string, string>,
  clausulasSelecionadas: string[],
  camposOpcionais: string[]
): unknown[] {
  // 1. Preenche o documento via motor (título + corpo)
  const linhasPreenchidas = fillDocument(
    {
      titulo: modelo.template.titulo,
      corpo: modelo.template.corpo,
      respostas,
      clausulasSelecionadas,
      modelo,
    },
    { camposOpcionais }
  );

  // 2. Classifica cada linha via motor e mapeia para pdfmake
  const content: unknown[] = [];
  for (const linha of linhasPreenchidas) {
    const classified = classifyLine(linha);

    if (classified.tipo === "empty") {
      content.push({ text: "", margin: [0, 4] });
      continue;
    }

    if (classified.tipo === "heading1") {
      // Se for o título principal (primeira linha), pula — é renderizado
      // separadamente no docDefinition.content[0]. Caso contrário, é uma
      // seção numerada (1. DAS PARTES).
      if (linha === modelo.template.titulo) continue;
      content.push({
        text: classified.texto,
        style: "sectionHeading",
        margin: [0, 12, 0, 4],
      });
      continue;
    }

    if (classified.tipo === "heading2") {
      content.push({
        text: classified.texto,
        style: "clauseHeading",
        margin: [0, 8, 0, 3],
      });
      continue;
    }

    if (classified.tipo === "signature") {
      content.push({
        text: classified.texto,
        style: "signature",
        margin: [0, 4, 0, 2],
      });
      continue;
    }

    if (classified.tipo === "witness") {
      content.push({
        text: classified.texto,
        style: "witness",
        margin: [0, 8, 0, 4],
      });
      continue;
    }

    // Parágrafo
    if (classified.tipo === "paragraph") {
      // Citação legal (entre aspas, contendo "Art." ou "Pena")
      if (
        classified.texto.startsWith('"') &&
        (classified.texto.includes("Art.") || classified.texto.includes("Pena"))
      ) {
        content.push({
          text: classified.texto,
          style: "legalQuote",
          margin: [20, 4, 20, 8],
        });
        continue;
      }

      // Label: "LOCADOR:" em bold
      const colonMatch = classified.texto.match(/^([A-ZÀ-Ú][A-ZÀ-Ú\s/()]+):\s*(.+)$/);
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
          text: classified.texto,
          style: "body",
          margin: [0, 0, 0, 6],
          alignment: "justify",
        });
      }
    }
  }

  return content;
}

// === Geração ================================================================

/**
 * Gera e baixa um PDF A4 do documento.
 *
 * @param modelo Modelo a usar (template + etapas para composição/cláusulas)
 * @param respostas Respostas brutas do usuário (campos individuais + `__clausula_${id}` = "true")
 * @param nomeArquivo Nome base do arquivo (sem extensão) — default: `${slug}-${data}`
 */
export async function gerarEBaixarPDF(
  modelo: Modelo,
  respostas: Record<string, string>,
  nomeArquivo?: string
): Promise<void> {
  const pdfmake = await loadPdfmake();

  // Extrai cláusulas selecionadas das respostas (convenção __clausula_${id})
  const clausulasSelecionadas = extractClausulasSelecionadas(respostas);

  // Computa campos opcionais a partir das etapas do modelo (campos com
  // obrigatorio === false + campos individuais de endereço + separadores RG
  // + extras de cláusulas NÃO selecionadas).
  const camposOpcionais = computeCamposOpcionais(modelo, clausulasSelecionadas);

  const contentNodes = buildContent(modelo, respostas, clausulasSelecionadas, camposOpcionais);

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

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

/**
 * Computa a lista de campos opcionais a partir das etapas do modelo.
 * Inclui:
 *  - Campos com `obrigatorio === false`
 *  - Campos individuais de endereço (cepKey, logradouroKey, etc.)
 *  - Separadores de RG (`<prefix>_rg_separador`)
 *  - Extras de cláusulas NÃO selecionadas (devem virar "" no template)
 */
function computeCamposOpcionais(
  modelo: Modelo,
  clausulasSelecionadas: string[]
): string[] {
  const out: string[] = [];
  if (!modelo.etapas) return out;
  for (const etapa of modelo.etapas) {
    if (etapa.tipo === "campo_grupo") {
      for (const c of etapa.campos) {
        if (c.obrigatorio === false) out.push(c.key);
        if (c.key === "rg" || c.key.endsWith("_rg")) {
          const prefix = c.key === "rg" ? "" : c.key.slice(0, -3);
          out.push(prefix ? `${prefix}_rg_separador` : "rg_separador");
        }
      }
      if (etapa.endereco) {
        const e = etapa.endereco;
        out.push(e.cepKey, e.logradouroKey, e.numeroKey, e.bairroKey, e.cidadeKey, e.ufKey);
        if (e.complementoKey) out.push(e.complementoKey);
      }
    } else if (etapa.tipo === "campo" && etapa.campo.obrigatorio === false) {
      out.push(etapa.campo.key);
    } else if (etapa.tipo === "clausulas") {
      for (const cl of etapa.clausulas) {
        if (!clausulasSelecionadas.includes(cl.id) && cl.camposExtras) {
          for (const ex of cl.camposExtras) out.push(ex.key);
        }
      }
    }
  }
  return out;
}

export async function preloadPdfmake(): Promise<void> {
  await loadPdfmake();
}
