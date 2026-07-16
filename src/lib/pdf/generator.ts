/**
 * PDF generation with pdfmake 0.3+.
 *
 * Produz um PDF A4 profissional usando o motor em `lib/document-engine/`
 * (single source of truth para preenchimento + classificação). Mudou alguma
 * regra de renderização? Muda no motor, todos os renderers (PreviewA4,
 * DetalhePreview, PDF) acompanham automaticamente.
 *
 * Features:
 * - Título centralizado em negrito e sublinhado
 * - Parágrafos justificados com espaçamento adequado
 * - Detecção automática de cláusulas (CLÁUSULA PRIMEIRA – DO OBJETO) → bold
 * - Detecção de seções numeradas (1. DAS PARTES) → bold
 * - Labels (LOCADOR:, LOCATÁRIO:) em bold inline
 * - Citações legais (art. 299 CP) em itálico
 * - Assinaturas preservadas do template em blocos inquebráveis
 * - Footer limpo: "Gerado por DocFacil" + data + página X/Y
 * - Marca d'água opcional dependendo do plano de assinatura
 */
import {
  fillDocument,
  classifyLine,
  extractClausulasSelecionadas,
  computeCamposOpcionais,
} from "../document-engine";
import type { Modelo } from "../types";

type PdfMakeModule = typeof import("pdfmake/build/pdfmake");
type PdfMakeContext = {
  createPdf: (docDefinition: unknown) => any;
};

const CM_TO_PT = 28.3464566929;
function cm(value: number) {
  return Number((value * CM_TO_PT).toFixed(2));
}

const CONTENT_WIDTH = cm(21) - 2 * cm(3.15); // 21cm (A4 width) - 3.15cm margins on both sides

let pdfmakePromise: Promise<PdfMakeContext> | null = null;

// === Fonte / VFS Setup ===

function extractVfs(moduleValue: any): Record<string, string> | undefined {
  const candidates = [
    moduleValue?.pdfMake?.vfs,
    moduleValue?.default?.pdfMake?.vfs,
    moduleValue?.vfs,
    moduleValue?.default?.vfs,
    moduleValue?.default,
    moduleValue,
  ];

  return candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      Object.keys(candidate).some((key) => /\.ttf$/i.test(key))
  );
}

function aliasFont(vfs: Record<string, string>, target: string, sources: string[]) {
  if (vfs[target]) return;
  const source = sources.find((candidate) => vfs[candidate]);
  if (source) {
    vfs[target] = vfs[source];
  }
}

function configurePdfMakeFonts(pdfMake: any, pdfFontsModule: any) {
  const bundledVfs = extractVfs(pdfFontsModule);
  const mergedVfs = {
    ...(pdfMake.vfs || {}),
    ...(bundledVfs || {}),
  };

  const hasRegular = Boolean(mergedVfs["Roboto-Regular.ttf"]);
  const hasMedium = Boolean(mergedVfs["Roboto-Medium.ttf"]);
  const hasBold = Boolean(mergedVfs["Roboto-Bold.ttf"]);
  const hasItalic = Boolean(mergedVfs["Roboto-Italic.ttf"]);
  const hasMediumItalic = Boolean(mergedVfs["Roboto-MediumItalic.ttf"]);
  const hasBoldItalic = Boolean(mergedVfs["Roboto-BoldItalic.ttf"]);

  aliasFont(mergedVfs, "Roboto-Regular.ttf", ["Roboto-Regular.ttf", "Roboto-Medium.ttf", "Roboto-Bold.ttf"]);
  aliasFont(mergedVfs, "Roboto-Medium.ttf", ["Roboto-Medium.ttf", "Roboto-Bold.ttf", "Roboto-Regular.ttf"]);
  aliasFont(mergedVfs, "Roboto-Italic.ttf", ["Roboto-Italic.ttf", "Roboto-Regular.ttf"]);
  aliasFont(mergedVfs, "Roboto-MediumItalic.ttf", [
    "Roboto-MediumItalic.ttf",
    "Roboto-BoldItalic.ttf",
    "Roboto-Italic.ttf",
    "Roboto-Regular.ttf",
  ]);

  if (!hasRegular && !hasMedium && !hasBold && !mergedVfs["Roboto-Regular.ttf"]) {
    throw new Error("Nenhuma fonte Roboto foi carregada no VFS do pdfmake.");
  }

  const regularFile = mergedVfs["Roboto-Regular.ttf"] ? "Roboto-Regular.ttf" : hasMedium ? "Roboto-Medium.ttf" : "Roboto-Bold.ttf";
  const boldFile = hasMedium ? "Roboto-Medium.ttf" : hasBold ? "Roboto-Bold.ttf" : regularFile;
  const italicFile = hasItalic ? "Roboto-Italic.ttf" : regularFile;
  const boldItalicFile = hasMediumItalic
    ? "Roboto-MediumItalic.ttf"
    : hasBoldItalic
      ? "Roboto-BoldItalic.ttf"
      : italicFile;

  pdfMake.vfs = mergedVfs;
  pdfMake.fonts = {
    ...(pdfMake.fonts || {}),
    Roboto: {
      normal: regularFile,
      bold: boldFile,
      italics: italicFile,
      bolditalics: boldItalicFile,
    },
  };
}

async function loadPdfmake(): Promise<PdfMakeContext> {
  if (!pdfmakePromise) {
    pdfmakePromise = (async () => {
      const rawMod = await import("pdfmake/build/pdfmake");
      const mod = (rawMod as any).default || rawMod;
      const pdfFontsModule = (await import("pdfmake/build/vfs_fonts")).default;

      // Next.js / ESM freezes the module namespace.
      // We pass a mutable object to act as the context for mod.createPdf.
      const ctx = {
        fonts: mod.fonts || {},
        vfs: mod.vfs || {},
        virtualfs: mod.virtualfs,
        urlAccessPolicy: mod.urlAccessPolicy,
        localAccessPolicy: mod.localAccessPolicy,
        tableLayouts: (mod as unknown as { tableLayouts?: unknown }).tableLayouts,
        progressCallback: (mod as unknown as { progressCallback?: unknown }).progressCallback,
      };

      configurePdfMakeFonts(ctx, pdfFontsModule);

      const createPdf = mod.createPdf.bind(ctx) as (docDefinition: unknown) => any;
      const _transformToDocument = (mod as unknown as { _transformToDocument: any })._transformToDocument.bind(ctx);
      (ctx as unknown as { _transformToDocument: unknown })._transformToDocument = _transformToDocument;

      return { createPdf };
    })();
  }
  return pdfmakePromise;
}

// === Destaque automático de nomes (splitStrongSegments) ===

const NAME_CONNECTORS = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);

const NON_NAME_UPPERCASE_TOKENS = new Set([
  "CPF", "RG", "CNH", "CTPS", "RNM", "DETRAN", "SESP", "SESPDC", "SSP", "SSPDC",
  "SC", "PR", "RS", "SP", "RJ", "MG", "CEP", "UF", "CRP", "CRM", "OAB", "CREA",
  "CRC", "CRO", "COREN", "CRESS", "CREF", "CTC", "CNIS", "INSS", "PIS", "PASEP",
  "NIT", "OBS"
]);

const STRONG_SEQUENCE_REGEX =
  /(^|[^A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ0-9º°/\-])([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]{3,}(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]{2,})+)(?=$|[^A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ0-9º°/\-])/g;

function normalizeStrongToken(value: string) {
  return value.replace(/[^A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]/g, "");
}

function isStrongNameCandidate(value: string, beforeText = "") {
  const clean = value.replace(/\s+/g, " ").trim();

  if (!clean) return false;
  if (/[\d/º°-]/.test(clean)) return false;
  if (/n[º°o.]?\s*$/i.test(beforeText)) return false;
  if (/(?:cpf|rg|cnh|ctps|rnm|documento|identidade|habilitação|trabalho)\s*(?:n[º°o.]?\s*)?$/i.test(beforeText)) return false;

  const tokens = clean
    .split(/\s+/)
    .map(normalizeStrongToken)
    .filter(Boolean);
  const meaningfulTokens = tokens.filter((token) => !NAME_CONNECTORS.has(token));

  if (meaningfulTokens.length < 2) return false;

  return meaningfulTokens.every((token) => !NON_NAME_UPPERCASE_TOKENS.has(token));
}

function splitStrongSegments(text: string): { text: string; bold?: boolean; underline?: boolean }[] {
  const value = String(text || "");
  const segments: { text: string; bold?: boolean; underline?: boolean }[] = [];
  let cursor = 0;

  value.replace(STRONG_SEQUENCE_REGEX, (match, prefix: string, candidate: string, offset: number) => {
    const prefixText = String(prefix || "");
    const candidateText = String(candidate || "");
    const candidateStart = offset + prefixText.length;

    if (candidateStart > cursor) {
      segments.push({ text: value.slice(cursor, candidateStart) });
    }

    const beforeText = value.slice(Math.max(0, candidateStart - 32), candidateStart);
    const isStrong = isStrongNameCandidate(candidateText, beforeText);

    segments.push({
      text: candidateText,
      bold: isStrong,
    });

    cursor = candidateStart + candidateText.length;
    return match;
  });

  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor) });
  }

  return segments.filter((segment) => segment.text);
}

function normalizePdfText(value: string) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function textRuns(
  text: string,
  options?: { indentFirstLine?: boolean; italics?: boolean; strongStyle?: string }
) {
  const runs = splitStrongSegments(normalizePdfText(text)).map((segment) => ({
    text: segment.text,
    bold: Boolean(segment.bold),
    italics: Boolean(options?.italics),
  }));

  if (!options?.indentFirstLine) return runs;

  return [
    {
      text: "          ",
      preserveLeadingSpaces: true,
    },
    ...runs,
  ];
}

// === Build content via motor ===

function findClosingSectionIndex(linhas: string[]): number {
  for (let idx = 0; idx < linhas.length; idx++) {
    const text = linhas[idx].trim();
    const lower = text.toLowerCase();
    const isDateLine =
      lower.includes("[data de assinatura]") ||
      /,\s*\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}/i.test(text);
    if (
      lower.startsWith("e, por estarem") ||
      lower.startsWith("e, por assim") ||
      lower.includes("justos e contratados") ||
      lower.includes("justos e acordados") ||
      lower.includes("justas e contratadas") ||
      isDateLine ||
      text.startsWith("[ASSINATURA]") ||
      text.startsWith("[TESTEMUNHA]")
    ) {
      return idx;
    }
  }
  return -1;
}

function renderLineNode(linha: string, list: string[], index: number): { element: unknown; nextIndex: number } | null {
  const classified = classifyLine(linha);
  let nextIndex = index + 1;

  if (classified.tipo === "empty") {
    return {
      element: { text: "", margin: [0, 2] },
      nextIndex,
    };
  }

  if (classified.tipo === "heading1") {
    return {
      element: {
        text: classified.texto,
        style: "sectionHeading",
        margin: [0, 18, 0, 8],
        keepWithNext: true,
      },
      nextIndex,
    };
  }

  if (classified.tipo === "heading2") {
    return {
      element: {
        text: classified.texto,
        style: "clauseHeading",
        margin: [0, 14, 0, 6],
        keepWithNext: true,
      },
      nextIndex,
    };
  }

  if (classified.tipo === "signature" || classified.tipo === "witness") {
    const isWitness = classified.tipo === "witness";
    const stackItems: unknown[] = [
      {
        text: classified.texto,
        style: isWitness ? "witness" : "signature",
        margin: [0, 4, 0, 2],
      }
    ];

    while (index + 1 < list.length) {
      const nextLinha = list[index + 1];
      const nextClassified = classifyLine(nextLinha);
      if (nextClassified.tipo === "paragraph" || nextClassified.tipo === "witness") {
        const isNextWitness = nextClassified.tipo === "witness";
        stackItems.push({
          text: textRuns(nextLinha, { strongStyle: "bold" }),
          style: isNextWitness ? "witness" : "body",
          margin: [0, 0, 0, 4],
          alignment: isWitness || isNextWitness ? ("left" as const) : ("center" as const),
        });
        index++;
        nextIndex = index + 1;
      } else {
        break;
      }
    }

    return {
      element: {
        stack: stackItems,
        margin: [0, isWitness ? 6 : 12, 0, isWitness ? 6 : 12],
        alignment: isWitness ? ("left" as const) : ("center" as const),
      },
      nextIndex,
    };
  }

  if (classified.tipo === "paragraph") {
    // Detect date line
    if (classified.texto.includes("data de assinatura") || classified.texto.includes("Data de assinatura") || /,\s*\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}/i.test(classified.texto)) {
      return {
        element: {
          text: textRuns(classified.texto),
          style: "body",
          margin: [0, 14, 0, 14],
          alignment: "right" as const,
        },
        nextIndex,
      };
    }

    // Detect parenthesized subtitle
    if (classified.texto.startsWith("(") && classified.texto.endsWith(")")) {
      return {
        element: {
          text: textRuns(classified.texto, { italics: true }),
          style: "body",
          margin: [0, 0, 0, 12],
          alignment: "center" as const,
        },
        nextIndex,
      };
    }

    if (
      classified.texto.startsWith('"') &&
      (classified.texto.includes("Art.") || classified.texto.includes("Pena"))
    ) {
      return {
        element: {
          text: textRuns(classified.texto, { italics: true }),
          style: "legalQuote",
          margin: [20, 6, 20, 10],
        },
        nextIndex,
      };
    }

    const colonMatch = classified.texto.match(/^([A-ZÀ-Ú][A-ZÀ-Ú\s/()]+):\s*(.+)$/);
    if (colonMatch && colonMatch[1].length < 40) {
      return {
        element: {
          text: [
            { text: colonMatch[1] + ": ", style: "label" },
            ...textRuns(colonMatch[2])
          ],
          margin: [0, 0, 0, 8],
          alignment: "justify" as const,
        },
        nextIndex,
      };
    } else {
      return {
        element: {
          text: textRuns(classified.texto, { indentFirstLine: true }),
          style: "body",
          margin: [0, 0, 0, 10],
          alignment: "justify" as const,
        },
        nextIndex,
      };
    }
  }

  return null;
}

interface SignatureBlock {
  line: string;
  details: string[];
}

function buildSignatureColumns(blocks: SignatureBlock[]): unknown {
  if (blocks.length === 1) {
    const b = blocks[0];
    return {
      stack: [
        { text: "________________________________________", style: "signature", margin: [0, 4, 0, 2] },
        ...b.details.map((d) => ({
          text: textRuns(d),
          style: "body",
          margin: [0, 0, 0, 4],
        })),
      ],
      alignment: "center" as const,
      margin: [0, 12, 0, 12],
    };
  }

  const rows: unknown[] = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const pair = blocks.slice(i, i + 2);
    if (pair.length === 2) {
      rows.push({
        columns: [
          {
            stack: [
              { text: "________________________________________", style: "signature", margin: [0, 4, 0, 2] },
              ...pair[0].details.map((d) => ({
                text: textRuns(d),
                style: "body",
                margin: [0, 0, 0, 4],
              })),
            ],
            alignment: "center" as const,
            width: "*" as const,
          },
          {
            stack: [
              { text: "________________________________________", style: "signature", margin: [0, 4, 0, 2] },
              ...pair[1].details.map((d) => ({
                text: textRuns(d),
                style: "body",
                margin: [0, 0, 0, 4],
              })),
            ],
            alignment: "center" as const,
            width: "*" as const,
          },
        ],
        columnGap: 24,
        margin: [0, 12, 0, 12],
      });
    } else {
      rows.push({
        columns: [
          { text: "", width: "*" as const },
          {
            stack: [
              { text: "________________________________________", style: "signature", margin: [0, 4, 0, 2] },
              ...pair[0].details.map((d) => ({
                text: textRuns(d),
                style: "body",
                margin: [0, 0, 0, 4],
              })),
            ],
            alignment: "center" as const,
            width: "auto" as const,
          },
          { text: "", width: "*" as const },
        ],
        margin: [0, 12, 0, 12],
      });
    }
  }

  return { stack: rows };
}

function buildContent(
  modelo: Modelo,
  respostas: Record<string, string>,
  clausulasSelecionadas: string[],
  camposOpcionais: string[]
): unknown[] {
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

  // Discard the title line, as it is rendered separately at the top
  const linhasCorpo = linhasPreenchidas.slice(1);
  const closingIdx = findClosingSectionIndex(linhasCorpo);

  const bodyLines = closingIdx !== -1 ? linhasCorpo.slice(0, closingIdx) : linhasCorpo;
  const closingLines = closingIdx !== -1 ? linhasCorpo.slice(closingIdx) : [];

  const content: unknown[] = [];

  // Render body
  let i = 0;
  while (i < bodyLines.length) {
    const node = renderLineNode(bodyLines[i], bodyLines, i);
    if (node) {
      content.push(node.element);
      i = node.nextIndex;
    } else {
      i++;
    }
  }

  // Render closing section (unbreakable stack)
  if (closingLines.length > 0) {
    const closingNodes: unknown[] = [];
    let j = 0;
    while (j < closingLines.length) {
      const line = closingLines[j];
      const classified = classifyLine(line);
      
      if (classified.tipo === "signature") {
        const sigBlocks: SignatureBlock[] = [];
        while (j < closingLines.length) {
          const currentLine = closingLines[j];
          const currentClassified = classifyLine(currentLine);
          
          if (currentClassified.tipo === "signature") {
            const details: string[] = [];
            j++;
            while (j < closingLines.length) {
              const nextLine = closingLines[j];
              const nextClassified = classifyLine(nextLine);
              if (nextClassified.tipo === "paragraph") {
                details.push(nextLine);
                j++;
              } else {
                break;
              }
            }
            sigBlocks.push({ line: currentLine, details });
          } else if (currentClassified.tipo === "empty") {
            j++;
          } else {
            break;
          }
        }
        if (sigBlocks.length > 0) {
          closingNodes.push(buildSignatureColumns(sigBlocks));
        }
      } else {
        const node = renderLineNode(line, closingLines, j);
        if (node) {
          closingNodes.push(node.element);
          j = node.nextIndex;
        } else {
          j++;
        }
      }
    }
    content.push({
      stack: closingNodes,
      unbreakable: true,
      margin: [0, 15, 0, 0],
    });
  }

  return content;
}

// === Geração ===

export async function gerarEBaixarPDF(
  modelo: Modelo,
  respostas: Record<string, string>,
  nomeArquivo?: string,
  options?: { watermark?: boolean }
): Promise<void> {
  const pdfmake = await loadPdfmake();

  const clausulasSelecionadas = extractClausulasSelecionadas(respostas);
  const camposOpcionais = computeCamposOpcionais(modelo, clausulasSelecionadas);
  const contentNodes = buildContent(modelo, respostas, clausulasSelecionadas, camposOpcionais);

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const docDefinition = {
    pageSize: "A4" as const,
    pageMargins: [cm(3.15), cm(3.45), cm(3.15), cm(2.6)] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 13,
      lineHeight: 1.5,
      color: "#0e2340",
    },
    watermark: options?.watermark
      ? {
          text: "DOCFACIL",
          color: "#2554c7",
          opacity: 0.05,
          bold: true,
          angle: -45,
          fontSize: 60,
        }
      : undefined,
    header: (currentPage: number) => {
      if (currentPage > 1) {
        return {
          margin: [cm(3.15), cm(1.2), cm(3.15), 0] as [number, number, number, number],
          stack: [
            {
              columns: [
                { text: modelo.template.titulo, style: "headerContinuation", width: "*" },
                { text: `pág. ${currentPage}`, style: "headerContinuation", width: "auto", alignment: "right" as const },
              ],
            },
            {
              canvas: [{
                type: "line" as const, x1: 0, y1: 4, x2: CONTENT_WIDTH, y2: 4,
                lineWidth: 0.8, lineColor: "#14315c",
              }],
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
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },
      {
        canvas: [{
          type: "line" as const, x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0,
          lineWidth: 1.5, lineColor: "#14315c",
        }],
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
            lineWidth: 0.8, lineColor: "#14315c",
          }],
        },
        {
          columns: [
            { text: "Gerado por DocFacil", style: "footerText" },
            { text: `${dataHoje} — pág. ${currentPage}/${pageCount}`, style: "footerText", alignment: "right" as const },
          ],
          margin: [0, 4, 0, 0] as [number, number, number, number],
        },
      ],
    }),
    styles: {
      docTitle: { font: "Roboto", fontSize: 16, bold: true, color: "#14315c", characterSpacing: 1.2 },
      sectionHeading: { font: "Roboto", fontSize: 13, bold: true, color: "#14315c" },
      clauseHeading: { font: "Roboto", fontSize: 13, bold: true, color: "#14315c" },
      body: { font: "Roboto", fontSize: 13, color: "#0e2340", lineHeight: 1.5 },
      label: { font: "Roboto", fontSize: 13, bold: true, color: "#0e2340" },
      signature: { font: "Roboto", fontSize: 13, color: "#0e2340", lineHeight: 1 },
      legalQuote: { font: "Roboto", fontSize: 11, italics: true, color: "#5a6b82", lineHeight: 1.5 },
      witness: { font: "Roboto", fontSize: 9.5, italics: true, color: "#5a6b82" },
      headerContinuation: { font: "Roboto", fontSize: 9, color: "#5a6b82" },
      footerText: { font: "Roboto", fontSize: 8, color: "#5a6b82" },
    },
  };

  const nome = nomeArquivo || `${modelo.slug}-${dataHoje.replace(/\//g, "-")}`;
  pdfmake.createPdf(docDefinition).download(`${nome}.pdf`);
}

export async function preloadPdfmake(): Promise<void> {
  await loadPdfmake();
}

/**
 * Helper para testes: gera o PDF e retorna um Buffer do mesmo (executável no Node).
 */
export async function gerarPDFBuffer(
  modelo: Modelo,
  respostas: Record<string, string>,
  options?: { watermark?: boolean }
): Promise<Buffer> {
  const pdfmake = await loadPdfmake();

  const clausulasSelecionadas = extractClausulasSelecionadas(respostas);
  const camposOpcionais = computeCamposOpcionais(modelo, clausulasSelecionadas);
  const contentNodes = buildContent(modelo, respostas, clausulasSelecionadas, camposOpcionais);

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const docDefinition = {
    pageSize: "A4" as const,
    pageMargins: [cm(3.15), cm(3.45), cm(3.15), cm(2.6)] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 13,
      lineHeight: 1.5,
      color: "#0e2340",
    },
    watermark: options?.watermark
      ? {
          text: "DOCFACIL",
          color: "#2554c7",
          opacity: 0.05,
          bold: true,
          angle: -45,
          fontSize: 60,
        }
      : undefined,
    header: (currentPage: number) => {
      if (currentPage > 1) {
        return {
          margin: [cm(3.15), cm(1.2), cm(3.15), 0] as [number, number, number, number],
          stack: [
            {
              columns: [
                { text: modelo.template.titulo, style: "headerContinuation", width: "*" },
                { text: `pág. ${currentPage}`, style: "headerContinuation", width: "auto", alignment: "right" as const },
              ],
            },
            {
              canvas: [{
                type: "line" as const, x1: 0, y1: 4, x2: CONTENT_WIDTH, y2: 4,
                lineWidth: 0.8, lineColor: "#14315c",
              }],
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
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },
      {
        canvas: [{
          type: "line" as const, x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0,
          lineWidth: 1.5, lineColor: "#14315c",
        }],
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
            lineWidth: 0.8, lineColor: "#14315c",
          }],
        },
        {
          columns: [
            { text: "Gerado por DocFacil", style: "footerText" },
            { text: `${dataHoje} — pág. ${currentPage}/${pageCount}`, style: "footerText", alignment: "right" as const },
          ],
          margin: [0, 4, 0, 0] as [number, number, number, number],
        },
      ],
    }),
    styles: {
      docTitle: { font: "Roboto", fontSize: 16, bold: true, color: "#14315c", characterSpacing: 1.2 },
      sectionHeading: { font: "Roboto", fontSize: 13, bold: true, color: "#14315c" },
      clauseHeading: { font: "Roboto", fontSize: 13, bold: true, color: "#14315c" },
      body: { font: "Roboto", fontSize: 13, color: "#0e2340", lineHeight: 1.5 },
      label: { font: "Roboto", fontSize: 13, bold: true, color: "#0e2340" },
      signature: { font: "Roboto", fontSize: 13, color: "#0e2340", lineHeight: 1 },
      legalQuote: { font: "Roboto", fontSize: 11, italics: true, color: "#5a6b82", lineHeight: 1.5 },
      witness: { font: "Roboto", fontSize: 9.5, italics: true, color: "#5a6b82" },
      headerContinuation: { font: "Roboto", fontSize: 9, color: "#5a6b82" },
      footerText: { font: "Roboto", fontSize: 8, color: "#5a6b82" },
    },
  };

  const pdfDoc = pdfmake.createPdf(docDefinition);
  return new Promise<Buffer>((resolve, reject) => {
    try {
      pdfDoc.getBuffer((buf: any) => {
        resolve(Buffer.from(buf));
      });
    } catch (e) {
      reject(e);
    }
  });
}


