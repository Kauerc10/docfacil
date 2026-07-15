/**
 * Quebra de linha (wrapping) e paginação.
 *
 * - Wrapping: títulos não sofrem wrapping (sempre 1 linha visual); parágrafos,
 *   assinaturas e testemunhas são quebrados por palavra respeitando
 *   `charsPorLinha`.
 * - Paginação: agrupa em páginas de `linhasPorPagina` linhas visuais.
 *
 * Unifica a lógica que antes vivia duplicada em PreviewA4 e DetalhePreview.
 */
import { classifyLine, isTitulo } from "./classify";
import type { LinhaQuebrada, LinhaClassificada, PaginaRenderizada } from "./types";

/**
 * Quebra uma lista de linhas classificadas em linhas visuais (wrapped).
 * Títulos viram 1 linha visual; outros tipos são quebrados por palavra.
 */
export function wrapLines(
  linhas: LinhaClassificada[],
  charsPorLinha: number
): LinhaQuebrada[] {
  const todas: LinhaQuebrada[] = [];
  for (const l of linhas) {
    if (l.tipo === "empty") {
      // linha em branco vira uma linha visual vazia (preserva espaçamento)
      todas.push({ tipo: "empty", texto: "" });
      continue;
    }
    if (isTitulo(l.tipo) || !l.texto) {
      // títulos não quebram — sempre 1 linha visual
      todas.push({ tipo: l.tipo, texto: l.texto });
      continue;
    }
    // wrapping por palavra
    const palavras = l.texto.split(/\s+/).filter(Boolean);
    let atual = "";
    for (const p of palavras) {
      if ((atual + " " + p).trim().length > charsPorLinha) {
        if (atual) todas.push({ tipo: l.tipo, texto: atual.trim() });
        atual = p;
      } else {
        atual = (atual + " " + p).trim();
      }
    }
    if (atual.trim()) todas.push({ tipo: l.tipo, texto: atual.trim() });
    else if (palavras.length === 0) todas.push({ tipo: l.tipo, texto: "" });
  }
  return todas;
}

/**
 * Agrupa linhas quebradas em páginas de N linhas.
 * Retorna sempre pelo menos 1 página (mesmo que vazia).
 */
export function paginate(
  linhas: LinhaQuebrada[],
  linhasPorPagina: number
): PaginaRenderizada[] {
  const total = Math.max(1, Math.ceil(linhas.length / linhasPorPagina));
  const out: PaginaRenderizada[] = [];
  for (let i = 0; i < linhas.length; i += linhasPorPagina) {
    const slice = linhas.slice(i, i + linhasPorPagina);
    out.push({
      linhas: slice,
      numero: out.length + 1,
      total,
    });
  }
  if (out.length === 0) {
    out.push({ linhas: [], numero: 1, total: 1 });
  }
  // atualiza total em todas (caso tenha mudado)
  return out.map((p) => ({ ...p, total: out.length }));
}

/**
 * Helper de uma linha: converte uma string com prefixo `__tipo__` (formato
 * legado usado pelos componentes PreviewA4/DetalhePreview) de volta para
 * LinhaQuebrada. Usado durante a migração — novos components devem usar
 * `LinhaQuebrada` direto.
 */
export function parseWrappedLine(linha: string): LinhaQuebrada {
  const match = linha.match(/^__(\w+)__(.*)$/);
  if (match) {
    return { tipo: match[1] as LinhaQuebrada["tipo"], texto: match[2] };
  }
  return { tipo: "paragraph", texto: linha };
}

/**
 * Helper inverso: serializa uma LinhaQuebrada para o formato `__tipo__texto`.
 * Mantém compatibilidade com componentes que ainda usam strings com prefixo.
 */
export function serializeWrappedLine(linha: LinhaQuebrada): string {
  return `__${linha.tipo}__${linha.texto}`;
}

/**
 * Helper: classificar E quebrar uma lista de linhas de template já
 * preenchidas, em uma única chamada. Combina `classifyLine` + `wrapLines`.
 */
export function classifyAndWrap(
  linhas: string[],
  charsPorLinha: number
): LinhaQuebrada[] {
  const classified = linhas.map(classifyLine);
  return wrapLines(classified, charsPorLinha);
}
