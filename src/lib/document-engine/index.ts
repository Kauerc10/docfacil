/**
 * Motor de renderização de documentos — API pública.
 *
 * Single source of truth para preencher templates, classificar linhas,
 * quebrar/paginar e compor endereços. Usado por:
 *   - `PreviewA4` (live preview no fluxo /criar)
 *   - `DetalhePreview` (prévia do documento salvo em /documento-detalhe)
 *   - `gerarEBaixarPDF` (geração de PDF para download)
 *   - qualquer futuro renderer (e-mail, share, print, etc.)
 *
 * Para adicionar um novo modelo, basta definir `etapas` + `template` em
 * `lib/modelos.ts` — o motor cuida do resto. Ver `EtapaModelo` em
 * `lib/types.ts` para os 3 tipos suportados (campo, campo_grupo, clausulas).
 *
 * Exemplo de uso (renderer visual):
 * ```ts
 * import { renderDocument } from "@/lib/document-engine";
 *
 * const paginas = renderDocument({
 *   titulo: modelo.template.titulo,
 *   corpo: modelo.template.corpo,
 *   respostas: doc.respostas,
 *   clausulasSelecionadas: doc.clausulasSelecionadas ?? [],
 *   modelo,
 * }, { camposOpcionais });
 * ```
 *
 * Exemplo de uso (PDF, com seu próprio paginator):
 * ```ts
 * import { fillDocument } from "@/lib/document-engine";
 *
 * const linhas = fillDocument({ titulo, corpo, respostas, modelo });
 * // → ["TÍTULO PREENCHIDO", "Linha 1 preenchida", "Linha 2 preenchida", ...]
 * ```
 */
export type {
  TipoLinha,
  LinhaClassificada,
  LinhaQuebrada,
  PaginaRenderizada,
  RenderInput,
  RenderOptions,
} from "./types";

export {
  fillTemplate,
  fillTemplateOrNull,
  buildClausulaMap,
} from "./template";

export {
  composeEndereco,
  aplicarComposicaoModelo,
  aplicarComposicaoEndereco,
  extractClausulasSelecionadas,
  encodeClausulasSelecionadas,
  CLAUSULA_KEY_PREFIX,
} from "./compose";

export {
  deserializeMoradoresAutorizados,
  parseMoradoresAutorizados,
  serializeMoradoresAutorizados,
  hasInvalidMoradoresAutorizados,
  formatMoradoresAutorizadosClause,
  type MoradorAutorizado,
} from "./authorized-residents";

export {
  classifyLine,
  classifyLines,
  isTitulo,
  isRenderizavel,
} from "./classify";

export {
  wrapLines,
  paginate,
  parseWrappedLine,
  serializeWrappedLine,
  classifyAndWrap,
} from "./paginate";

export {
  renderDocument,
  fillDocument,
} from "./render";

export {
  computeCamposOpcionais,
} from "./optional-fields";

export {
  normalizarRespostasLegadasDeContrato,
  SINAL_LEGADO_SEM_FORMA_KEY,
} from "./legacy-contract-answers";
