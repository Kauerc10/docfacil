/**
 * Render de documentos — API de alto nível que combina todos os módulos:
 *
 *   1. `aplicarComposicaoModelo` — compõe endereços a partir das etapas
 *   2. `buildClausulaMap` — indexa cláusulas por id
 *   3. `applyLegalTemplateRule` — aplica regras jurídicas dependentes das respostas
 *   4. `fillTemplate` (em cada linha do corpo) — preenche `{{key}}` e `{{clausula:id}}`
 *   5. `classifyLine` — classifica cada linha em heading1/2/paragraph/...
 *   6. `wrapLines` + `paginate` — quebra por palavra e agrupa em páginas A4
 *
 * Retorna uma lista de `PaginaRenderizada` pronta para ser consumida por
 * qualquer renderer (PreviewA4, DetalhePreview, PDF, e-mail, etc.).
 *
 * Esta é a ÚNICA função que callers externos precisam usar. Mudou alguma
 * regra de renderização? Muda aqui, todos os renderers acompanham.
 */
import { aplicarComposicaoModelo } from "./compose";
import { buildClausulaMap, fillTemplate } from "./template";
import { applyLegalTemplateRule } from "./legal-rules";
import { classifyLine } from "./classify";
import { wrapLines, paginate } from "./paginate";
import type { PaginaRenderizada, RenderInput, RenderOptions } from "./types";

const DEFAULT_LINHAS_POR_PAGINA = 20;
const DEFAULT_CHARS_POR_LINHA = 78;

function prepareTemplateLine(
  line: string,
  modelSlug: string | undefined,
  answers: Record<string, string>
): string {
  return applyLegalTemplateRule(modelSlug, line, answers);
}

/**
 * Renderiza um documento em páginas A4 paginadas.
 *
 * @param input  Título, corpo, respostas, cláusulas selecionadas e modelo.
 * @param opts   Configurações de paginação/wrapping (opcionais com defaults).
 * @returns Array de páginas renderizadas (cada uma com `linhas`, `numero`, `total`).
 */
export function renderDocument(
  input: RenderInput,
  opts: RenderOptions = {}
): PaginaRenderizada[] {
  const {
    titulo,
    corpo,
    respostas,
    clausulasSelecionadas = [],
    modelo,
  } = input;

  const {
    linhasPorPagina = DEFAULT_LINHAS_POR_PAGINA,
    charsPorLinha = DEFAULT_CHARS_POR_LINHA,
    camposOpcionais = [],
    context,
  } = opts;

  // 1. Compõe endereços a partir das etapas do modelo (se houver).
  //    Sobrescreve qualquer string composta stale que possa estar nas respostas.
  const respostasCompostas = modelo
    ? aplicarComposicaoModelo(respostas, modelo)
    : { ...respostas };

  // 2. Indexa cláusulas por id (do modelo).
  const clausulaPorId = modelo?.etapas ? buildClausulaMap(modelo.etapas) : {};

  // 3. Preenche o título (heading1) — pode conter `{{key}}` também.
  const tituloPreenchido = fillTemplate(
    titulo,
    respostasCompostas,
    clausulaPorId,
    clausulasSelecionadas,
    camposOpcionais,
    context
  );

  // 4. Aplica regras do modelo, preenche cada linha do corpo e classifica.
  const linhasClassificadas = [
    // título sempre como heading1 (primeira linha da primeira página)
    { tipo: "heading1" as const, texto: tituloPreenchido },
    ...corpo.map((linha) => {
      const linhaPreparada = prepareTemplateLine(
        linha,
        modelo?.slug,
        respostasCompostas
      );
      const preenchida = fillTemplate(
        linhaPreparada,
        respostasCompostas,
        clausulaPorId,
        clausulasSelecionadas,
        camposOpcionais,
        context
      );
      return classifyLine(preenchida);
    }),
  ];

  // 5. Filtra linhas vazias EXCETO as que eram explicitamente `[ASSINATURA]`
  //    ou marcadores — preserva espaçamento intencional do template.
  //    Para evitar páginas em branco por cláusulas não selecionadas, removemos
  //    linhas `empty` consecutivas (mantemos só 1 por sequência).
  const linhasFiltradas = filtrarVaziasConsecutivas(linhasClassificadas);

  // 6. Quebra por palavra + pagina.
  const linhasQuebradas = wrapLines(linhasFiltradas, charsPorLinha);
  return paginate(linhasQuebradas, linhasPorPagina);
}

/**
 * Remove linhas `empty` consecutivas (mantém no máximo 1 por sequência).
 * Evita páginas em branco quando cláusulas não selecionadas deixam buracos.
 */
function filtrarVaziasConsecutivas<T extends { tipo: string }>(linhas: T[]): T[] {
  const out: T[] = [];
  let prevEmpty = false;
  for (const l of linhas) {
    const isEmpty = l.tipo === "empty";
    if (isEmpty && prevEmpty) continue; // skip empty consecutiva
    out.push(l);
    prevEmpty = isEmpty;
  }
  // remove empty no início e fim
  while (out.length > 0 && out[0].tipo === "empty") out.shift();
  while (out.length > 0 && out[out.length - 1].tipo === "empty") out.pop();
  return out;
}

/**
 * Helper: apenas preenche o template (sem classificar/paginar) — útil para
 * o gerador de PDF que tem seu próprio paginator (pdfmake).
 *
 * Retorna o array de linhas preenchidas (incluindo o título como primeiro
 * item) — pronto para qualquer renderer que queira fazer seu próprio wrapping.
 */
export function fillDocument(
  input: RenderInput,
  opts: RenderOptions = {}
): string[] {
  const { titulo, corpo, respostas, clausulasSelecionadas = [], modelo } = input;
  const { camposOpcionais = [], context } = opts;

  const respostasCompostas = modelo
    ? aplicarComposicaoModelo(respostas, modelo)
    : { ...respostas };

  const clausulaPorId = modelo?.etapas ? buildClausulaMap(modelo.etapas) : {};

  const tituloPreenchido = fillTemplate(
    titulo,
    respostasCompostas,
    clausulaPorId,
    clausulasSelecionadas,
    camposOpcionais,
    context
  );

  const corpoPreenchido = corpo.map((linha) => {
    const linhaPreparada = prepareTemplateLine(
      linha,
      modelo?.slug,
      respostasCompostas
    );
    return fillTemplate(
      linhaPreparada,
      respostasCompostas,
      clausulaPorId,
      clausulasSelecionadas,
      camposOpcionais,
      context
    );
  });

  // remove linhas vazias (cláusulas não selecionadas cujo corpo era a linha inteira)
  const corpoFiltrado = corpoPreenchido.filter((l) => l.trim());

  return [tituloPreenchido, ...corpoFiltrado];
}
