/**
 * Classificação de linhas — decide o tipo visual (heading1, heading2,
 * paragraph, signature, witness, empty) de cada linha do template após
 * preenchimento.
 *
 * Unifica a lógica que antes vivia duplicada em PreviewA4, DetalhePreview e
 * gerador de PDF. Os marcadores especiais suportados:
 *
 *   `# Título`           → heading1 (override explícito)
 *   `## Subtítulo`       → heading2 (override explícito)
 *   `[ASSINATURA] ...`   → signature (ou linhas com "Assinatura:")
 *   `[TESTEMUNHA] ...`   → witness (ou linhas com "Testemunha")
 *
 * Heurísticas automáticas (sem marcador):
 *   - Linha em branco                        → empty
 *   - "1. DAS PARTES" (numeração + MAIÚSC)   → heading1
 *   - "Cláusula Primeira:" / "CLÁUSULA ..."  → heading2
 *   - Linha iniciada por 5+ underscores       → signature
 *   - "OBSERVAÇÃO" / "RECONHECIMENTO" / "TESTEMUNHA" → witness
 *   - Caso contrário                          → paragraph
 */
import type { LinhaClassificada, TipoLinha } from "./types";

/**
 * Classifica UMA linha (após preenchimento) em seu tipo visual.
 *
 * @param linha Linha já preenchida (sem `{{key}}`).
 * @returns Objeto com `tipo` e `texto` (texto sem marcadores especiais).
 */
export function classifyLine(linha: string): LinhaClassificada {
  const trimmed = linha.trim();
  if (!trimmed) return { tipo: "empty", texto: "" };

  // === Marcadores explícitos (override) =================================
  if (trimmed.startsWith("# ")) {
    return { tipo: "heading1", texto: trimmed.slice(2).trim() };
  }
  if (trimmed.startsWith("## ")) {
    return { tipo: "heading2", texto: trimmed.slice(3).trim() };
  }
  if (trimmed.startsWith("[ASSINATURA]")) {
    return {
      tipo: "signature",
      texto: trimmed.replace(/^\[ASSINATURA\]\s*/, ""),
    };
  }
  if (trimmed.startsWith("[TESTEMUNHA]")) {
    return {
      tipo: "witness",
      texto: trimmed.replace(/^\[TESTEMUNHA\]\s*/, ""),
    };
  }

  // === Heurísticas automáticas ==========================================
  // "Assinatura:" ou "Assinatura do locador:"
  if (/assinatura\s*:/i.test(trimmed)) {
    return { tipo: "signature", texto: trimmed };
  }
  // "Testemunha 1:" ou "Testemunhas:"
  if (/testemunha/i.test(trimmed)) {
    return { tipo: "witness", texto: trimmed };
  }

  // Heading 1: "1. DAS PARTES" (numeração + MAIÚSCULAS)
  if (/^\d+\.\s+[A-ZÀ-Ú]/.test(trimmed) && trimmed === trimmed.toUpperCase()) {
    return { tipo: "heading1", texto: trimmed };
  }

  // Heading 2: "Cláusula Primeira:", "Cláusula de Multa:", "CLÁUSULA PRIMEIRA –"
  if (/^Cláusula(\s+\w+)?:/i.test(trimmed) || /^CLÁUSULA\s+/i.test(trimmed)) {
    return { tipo: "heading2", texto: trimmed };
  }

  // Linhas de testemunha (ex: "1) ______________" ou "Nome: _________________")
  if (/^\d+\)\s*_{3,}/.test(trimmed) || /nome:\s*_{3,}/i.test(trimmed) || /cpf:\s*_{3,}/i.test(trimmed)) {
    return { tipo: "witness", texto: trimmed };
  }

  // Linha de assinatura por heurística: precisa COMEÇAR com o traço de
  // assinatura. Campos ainda vazios dentro de um parágrafo também usam
  // underscores e não podem transformar o parágrafo inteiro em assinatura.
  if (/^_{5,}(?:\s+.*)?$/.test(trimmed)) {
    return { tipo: "signature", texto: trimmed };
  }

  // Observação / reconhecimento
  if (/^OBSERVAÇÃO|^RECONHECIMENTO/i.test(trimmed)) {
    return { tipo: "witness", texto: trimmed };
  }

  return { tipo: "paragraph", texto: trimmed };
}

/**
 * Classifica um array de linhas (após preenchimento).
 *
 * @param linhas Linhas já preenchidas.
 * @returns Array de LinhaClassificada (uma por linha de input).
 */
export function classifyLines(linhas: string[]): LinhaClassificada[] {
  return linhas.map(classifyLine);
}

/**
 * Verifica se um tipo de linha é "título" (não sofre wrapping de texto).
 */
export function isTitulo(tipo: TipoLinha): boolean {
  return tipo === "heading1" || tipo === "heading2";
}

/**
 * Verifica se um tipo de linha é renderizável (não é `empty`).
 */
export function isRenderizavel(tipo: TipoLinha): boolean {
  return tipo !== "empty";
}
