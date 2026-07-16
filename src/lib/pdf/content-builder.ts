/**
 * content-builder.ts — Transforma o template preenchido em nós do pdfmake.
 *
 * Este é o "cérebro" de renderização do PDF: recebe o modelo + respostas,
 * usa o motor (`document-engine`) para preencher e classificar cada linha,
 * e constrói a estrutura de nós (paragraph/heading/signature/list/quote)
 * que o pdfmake vai pintar na página.
 *
 * Responsabilidades:
 *  - Geometria A4: constantes `cm()`, `CM_TO_PT`, `CONTENT_WIDTH`
 *  - Texto: normalização, detecção de nomes próprios (bold), recuo de 1ª linha
 *  - Classificação visual: heading1 (com filete lateral), heading2, paragraph,
 *    signature, witness, legalQuote, listas (bullet)
 *  - Estrutura: findClosingSectionIndex (detecta bloco de assinaturas),
 *    buildSignatureColumns (colunas de assinaturas), buildContent (orquestra)
 *
 * Importa do `document-engine`: fillDocument, classifyLine,
 * extractClausulasSelecionadas, computeCamposOpcionais.
 */
import {
  fillDocument,
  classifyLine,
  extractClausulasSelecionadas,
  computeCamposOpcionais,
} from "../document-engine";
import type { Modelo } from "../types";

// === Geometria A4 (compartilhada com styles.ts) ===========================

export const CM_TO_PT = 28.3464566929;

/** Converte centímetros para pontos tipográficos (pt). */
export function cm(value: number): number {
  return Number((value * CM_TO_PT).toFixed(2));
}

/** Largura útil do conteúdo = largura A4 (21cm) - 2 × margem lateral (3.15cm). */
export const CONTENT_WIDTH = cm(21) - 2 * cm(3.15);

// === Normalização de texto ================================================

/**
 * Normaliza caracteres para o pdfmake: NBSP → espaço, aspas curvas → retas,
 * travessões → hífen, colapsa espaços duplos.
 */
export function normalizePdfText(value: string): string {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

// === Destaque automático de nomes próprios (splitStrongSegments) ==========

const NAME_CONNECTORS = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);

const NON_NAME_UPPERCASE_TOKENS = new Set([
  "CPF", "RG", "CNH", "CTPS", "RNM", "DETRAN", "SESP", "SESPDC", "SSP", "SSPDC",
  "SC", "PR", "RS", "SP", "RJ", "MG", "CEP", "UF", "CRP", "CRM", "OAB", "CREA",
  "CRC", "CRO", "COREN", "CRESS", "CREF", "CTC", "CNIS", "INSS", "PIS", "PASEP",
  "NIT", "OBS"
]);

const STRONG_SEQUENCE_REGEX =
  /(^|[^A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ0-9º°/\-])([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]{3,}(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]{2,})+)(?=$|[^A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ0-9º°/\-])/g;

function normalizeStrongToken(value: string): string {
  return value.replace(/[^A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]/g, "");
}

function isStrongNameCandidate(value: string, beforeText = ""): boolean {
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

/**
 * Quebra um texto em segments, marcando como `bold` as sequências que parecem
 * nomes próprios (2+ palavras em MAIÚSCULAS, excluindo siglas conhecidas).
 */
export function splitStrongSegments(text: string): { text: string; bold?: boolean; underline?: boolean }[] {
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

/**
 * Converte texto em "runs" do pdfmake (array de {text, bold, italics}).
 * Aplica splitStrongSegments (bold em nomes) + opcional recuo de 1ª linha.
 */
export function textRuns(
  text: string,
  options?: { indentFirstLine?: boolean; italics?: boolean; strongStyle?: string }
) {
  const runs = splitStrongSegments(normalizePdfText(text)).map((segment) => ({
    text: segment.text,
    bold: Boolean(segment.bold),
    italics: Boolean(options?.italics),
  }));

  if (!options?.indentFirstLine) return runs;

  // Recuo de primeira linha com NBSP (tipograficamente correto, não colapsa).
  return [
    {
      text: "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0",
      preserveLeadingSpaces: true,
    },
    ...runs,
  ];
}

// === Citações legais ======================================================

/**
 * Heurística ampliada para detecção de citações legais.
 * Captura art./Art., lei, código, CP, CC, CDC, CF/88, constituição,
 * pena — com ou sem aspas, case-insensitive.
 */
export const LEGAL_QUOTE_REGEX = /\b(art\.?\s*\d|lei\s*(n\.?)?\s*\d|c[oó]digo\s+\w|CP\b|CC\b|CDC\b|CF\/?88\b|constitui[çc][ãa]o\s+federal|pena\s+(de\s+)?\w)/i;

/** Retorna true se o texto parece ser uma citação de dispositivo legal. */
export function isLegalQuote(text: string): boolean {
  return LEGAL_QUOTE_REGEX.test(text);
}

// === Estrutura do documento ===============================================

/**
 * Encontra o índice onde começa o "fecho" (assinaturas + testemunhas + data).
 * Heurística: detecta frases fechas ("e, por estarem de acordo..."), linhas
 * de data, e marcadores [ASSINATURA]/[TESTEMUNHA].
 */
export function findClosingSectionIndex(linhas: string[]): number {
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

/**
 * Renderiza uma linha classificada num nó do pdfmake.
 * Ramifica por tipo: heading1 (filete lateral), heading2, signature/witness,
 * paragraph (com sub-casos: data, subtítulo entre parênteses, citação legal,
 * item de lista, label:valor, parágrafo default).
 *
 * Retorna `{ element, nextIndex }` onde nextIndex avança caso a função tenha
 * consumido linhas seguintes (ex.: signature agrupa details adjacentes;
 * bullet agrupa itens consecutivos).
 */
export function renderLineNode(linha: string, list: string[], index: number): { element: unknown; nextIndex: number } | null {
  const classified = classifyLine(linha);
  let nextIndex = index + 1;

  if (classified.tipo === "empty") {
    return {
      element: { text: "", margin: [0, 2] },
      nextIndex,
    };
  }

  if (classified.tipo === "heading1") {
    // Filete lateral curto à esquerda (efeito "sidebar rule") — hierarquia
    // visual clara: seções principais têm marca lateral azul-marinho.
    return {
      element: {
        columns: [
          {
            width: 3,
            canvas: [{
              type: "rect" as const,
              x: 0, y: 0, w: 2, h: 16,
              lineWidth: 0,
              fillColor: "#14315c",
            }],
            margin: [0, 3, 8, 0] as [number, number, number, number],
          },
          {
            text: classified.texto,
            style: "sectionHeading",
            width: "*",
          },
        ],
        margin: [0, 18, 0, 8] as [number, number, number, number],
        keepWithNext: true,
        unbreakable: true,
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
        unbreakable: true,
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
    // Linha de data (alinhada à direita)
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

    // Subtítulo entre parênteses (centralizado, itálico)
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

    // Citação legal ampliada: regex case-insensitive cobrindo art./lei/
    // código/CP/CC/CDC/CF/constituição/pena — com ou sem aspas.
    if (isLegalQuote(classified.texto)) {
      return {
        element: {
          text: textRuns(classified.texto, { italics: true }),
          style: "legalQuote",
          margin: [20, 6, 20, 10] as [number, number, number, number],
        },
        nextIndex,
      };
    }

    // Item de lista (bullet): linhas começando com -, •, *
    const bulletMatch = classified.texto.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      const items: unknown[] = [{ text: textRuns(bulletMatch[1]) }];
      while (index + 1 < list.length) {
        const nextLine = list[index + 1];
        const nextBullet = nextLine.match(/^[-•*]\s+(.+)$/);
        if (nextBullet) {
          items.push({ text: textRuns(nextBullet[1]) });
          index++;
          nextIndex = index + 1;
        } else {
          break;
        }
      }
      return {
        element: {
          ul: items,
          style: "body",
          margin: [16, 0, 0, 10] as [number, number, number, number],
        },
        nextIndex,
      };
    }

    // Label: valor (ex.: "LOCADOR: João da Silva")
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
    }

    // Parágrafo default (justificado, com recuo de 1ª linha)
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

  return null;
}

// === Assinaturas ==========================================================

interface SignatureBlock {
  line: string;
  details: string[];
}

/**
 * Monta as colunas de assinaturas a partir dos blocos coletados.
 * - 1 bloco: stack centralizado.
 * - 2+ blocos: colunas de 2 (width *), com columnGap 24.
 * - Ímpar (sobra): 3 colunas (vazio/assinatura/vazio) para centralizar a última.
 */
export function buildSignatureColumns(blocks: SignatureBlock[]): unknown {
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

// === Orquestração do conteúdo =============================================

/**
 * Constrói o array de nós de conteúdo (body + closing) a partir do modelo
 * preenchido.
 *
 * Pipeline:
 * 1. fillDocument (motor) preenche {{key}} e {{clausula:id}}
 * 2. Descarta o título (renderizado à parte no topo do content)
 * 3. findClosingSectionIndex separa corpo do fecho (assinaturas)
 * 4. renderLineNode em cada linha do corpo
 * 5. Bloco de fecho empacotado como stack (unbreakable se <= 4 nós)
 */
export function buildContent(
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

  // Descarta o título, renderizado separadamente no topo do content.
  const linhasCorpo = linhasPreenchidas.slice(1);
  const closingIdx = findClosingSectionIndex(linhasCorpo);

  const bodyLines = closingIdx !== -1 ? linhasCorpo.slice(0, closingIdx) : linhasCorpo;
  const closingLines = closingIdx !== -1 ? linhasCorpo.slice(closingIdx) : [];

  const content: unknown[] = [];

  // Renderiza o corpo
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

  // Renderiza o fecho (assinaturas) como stack não-quebrável (se pequeno)
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
    // Quebra inteligente: unbreakable apenas para closings pequenos (<= 4 nós).
    // Closings grandes (4+ signatários) podem quebrar entre páginas para
    // evitar grandes espaços em branco no fim da página anterior.
    const isLargeClosing = closingNodes.length > 4;
    content.push({
      stack: closingNodes,
      unbreakable: !isLargeClosing,
      margin: [0, 15, 0, 0] as [number, number, number, number],
    });
  }

  return content;
}

/** Re-export dos helpers de cláusulas/campos opcionais (conveniência). */
export { extractClausulasSelecionadas, computeCamposOpcionais };
