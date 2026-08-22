/**
 * Render de documentos — API de alto nível que combina todos os módulos:
 *
 *   1. `aplicarComposicaoModelo` — compõe endereços a partir das etapas
 *   2. `buildClausulaMap` — indexa cláusulas por id
 *   3. `applyLegalTitleRule`/`applyLegalTemplateRule` — ajustam redação por modelo
 *   4. `fillTemplate` — preenche `{{key}}` e `{{clausula:id}}`
 *   5. `classifyLine` — classifica cada linha em heading1/2/paragraph/...
 *   6. `wrapLines` + `paginate` — quebra por palavra e agrupa em páginas A4
 *
 * Esta é a API compartilhada por preview, detalhe e PDF. Mudou uma regra de
 * redação? Ela passa por aqui para evitar duas versões do mesmo documento.
 */
import { aplicarComposicaoModelo } from "./compose";
import { buildClausulaMap, fillTemplate } from "./template";
import { applyLegalTemplateRule, applyLegalTitleRule } from "./legal-rules";
import { normalizarRespostasLegadasDeContrato } from "./legacy-contract-answers";
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

function fillRenderedTitle(
  titulo: string,
  modelSlug: string | undefined,
  answers: Record<string, string>,
  clausulaPorId: Parameters<typeof fillTemplate>[2],
  clausulasSelecionadas: string[],
  camposOpcionais: string[],
  context: RenderOptions["context"]
): string {
  return fillTemplate(
    applyLegalTitleRule(modelSlug, titulo),
    answers,
    clausulaPorId,
    clausulasSelecionadas,
    camposOpcionais,
    context
  );
}

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

  const respostasCompativeis = modelo
    ? normalizarRespostasLegadasDeContrato(modelo, respostas)
    : respostas;
  const respostasCompostas = modelo
    ? aplicarComposicaoModelo(respostasCompativeis, modelo)
    : { ...respostasCompativeis };

  const clausulaPorId = modelo?.etapas ? buildClausulaMap(modelo.etapas) : {};

  const tituloPreenchido = fillRenderedTitle(
    titulo,
    modelo?.slug,
    respostasCompostas,
    clausulaPorId,
    clausulasSelecionadas,
    camposOpcionais,
    context
  );

  const linhasClassificadas = [
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

  const linhasFiltradas = filtrarVaziasConsecutivas(linhasClassificadas);
  const linhasQuebradas = wrapLines(linhasFiltradas, charsPorLinha);
  return paginate(linhasQuebradas, linhasPorPagina);
}

function filtrarVaziasConsecutivas<T extends { tipo: string }>(linhas: T[]): T[] {
  const out: T[] = [];
  let prevEmpty = false;
  for (const l of linhas) {
    const isEmpty = l.tipo === "empty";
    if (isEmpty && prevEmpty) continue;
    out.push(l);
    prevEmpty = isEmpty;
  }
  while (out.length > 0 && out[0].tipo === "empty") out.shift();
  while (out.length > 0 && out[out.length - 1].tipo === "empty") out.pop();
  return out;
}

/**
 * Preenche o documento sem aplicar o paginator aproximado do preview.
 * O pdfmake consome esta mesma saída textual e aplica seu paginator real.
 */
export function fillDocument(
  input: RenderInput,
  opts: RenderOptions = {}
): string[] {
  const { titulo, corpo, respostas, clausulasSelecionadas = [], modelo } = input;
  const { camposOpcionais = [], context } = opts;

  const respostasCompativeis = modelo
    ? normalizarRespostasLegadasDeContrato(modelo, respostas)
    : respostas;
  const respostasCompostas = modelo
    ? aplicarComposicaoModelo(respostasCompativeis, modelo)
    : { ...respostasCompativeis };

  const clausulaPorId = modelo?.etapas ? buildClausulaMap(modelo.etapas) : {};

  const tituloPreenchido = fillRenderedTitle(
    titulo,
    modelo?.slug,
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

  const corpoFiltrado = corpoPreenchido.filter((l) => l.trim());
  return [tituloPreenchido, ...corpoFiltrado];
}
