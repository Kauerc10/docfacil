/**
 * Preenchimento de template — substitui `{{key}}` e `{{clausula:id}}` por
 * valores concretos.
 *
 * TWO-PASS obrigatório: cláusulas podem conter `{{key}}` dentro do seu `corpo`
 * (ex.: `corpo: "Fiador {{fiador_nome}}, CPF {{fiador_cpf}}"`). Se fizéssemos
 * um único `String.replace`, os `{{key}}` dentro do corpo da cláusula
 * injetada NÃO seriam processados (JavaScript não re-escaneia o replacement
 * string). Por isso:
 *
 *   Passo 1: injeta `{{clausula:id}}` → corpo da cláusula (quando selecionada)
 *   Passo 2: substitui `{{key}}` → valor do mapa de respostas
 *
 * Após o passo 2, espaços duplos e vírgulas vazias são normalizados
 * (decorrentes de cláusulas não selecionadas que deixam buracos).
 */
import type { ClausulaDinamica, EtapaModelo } from "../types";

/** Marcador de espaço reservado quando um campo obrigatório não foi preenchido. */
const PLACEHOLDER = "______________________";

/**
 * Preenche um template de UMA linha com respostas + cláusulas selecionadas.
 *
 * @param template  Linha do template (ex.: "Eu, {{nome}}, declaro que resido em {{endereco}}.")
 * @param respostas Mapa de respostas (chave → valor)
 * @param clausulaPorId Mapa de cláusulas (id → objeto ClausulaDinamica)
 * @param clausulasSelecionadas IDs das cláusulas marcadas pelo usuário
 * @param camposOpcionais Chaves dos campos opcionais (vazios viram "" em vez de PLACEHOLDER)
 */
export function fillTemplate(
  template: string,
  respostas: Record<string, string>,
  clausulaPorId: Record<string, ClausulaDinamica>,
  clausulasSelecionadas: string[],
  camposOpcionais: string[] = []
): string {
  // === PASSO 1: injeta cláusulas selecionadas ============================
  // `{{clausula:id}}` → corpo da cláusula (quando selecionada) ou "".
  // O corpo pode conter `{{key}}` que será resolvido no passo 2.
  let result = template.replace(/\{\{\s*clausula:([^}]+?)\s*\}\}/g, (_match, id: string) => {
    const cid = id.trim();
    if (!clausulasSelecionadas.includes(cid)) return "";
    const cl = clausulaPorId[cid];
    return cl?.corpo ?? "";
  });

  // === PASSO 2: substitui `{{key}}` por valores ==========================
  result = result.replace(/\{\{\s*([^}:][^}]*?)\s*\}\}/g, (_match, key: string) => {
    const k = key.trim();
    const valor = respostas[k];
    if (valor && valor.trim()) return valor;
    if (camposOpcionais.includes(k)) return "";
    return PLACEHOLDER;
  });

  // === Normalização pós-preenchimento ====================================
  // Remove espaços duplos (decorrentes de campos opcionais vazios) e
  // vírgulas vazias (", ," → ",").
  result = result.replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",");
  // Remove " - " sobrando no início/meio quando partes opcionais vazias
  result = result.replace(/\s*-\s*-\s*/g, " - ").replace(/^\s*-\s*/, "").replace(/\s*-\s*$/, "");

  return result.trim();
}

/**
 * Preenche um template de UMA linha, retornando `null` se a linha inteira
 * ficou vazia (ex.: cláusula não selecionada cujo corpo era a linha inteira).
 *
 * Útil para filtros de linhas vazias no render.
 */
export function fillTemplateOrNull(
  template: string,
  respostas: Record<string, string>,
  clausulaPorId: Record<string, ClausulaDinamica>,
  clausulasSelecionadas: string[],
  camposOpcionais: string[] = []
): string | null {
  const filled = fillTemplate(template, respostas, clausulaPorId, clausulasSelecionadas, camposOpcionais);
  return filled.trim() ? filled : null;
}

/**
 * Constrói o mapa `id → ClausulaDinamica` a partir das etapas do modelo.
 * Centraliza a extração pra callers não precisarem iterar etapas toda hora.
 */
export function buildClausulaMap(
  etapas?: EtapaModelo[]
): Record<string, ClausulaDinamica> {
  const map: Record<string, ClausulaDinamica> = {};
  if (!etapas) return map;
  for (const etapa of etapas) {
    if (etapa.tipo === "clausulas") {
      for (const cl of etapa.clausulas) {
        map[cl.id] = cl;
      }
    }
  }
  return map;
}
