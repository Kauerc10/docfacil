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
import { type RenderContext, createRenderContext } from "./types";
import { converterValorMoedaParaExtenso } from "./money";

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
 * @param context Contexto de renderização determinístico (datas, locale, timezone)
 */
export function fillTemplate(
  template: string,
  respostas: Record<string, string>,
  clausulaPorId: Record<string, ClausulaDinamica>,
  clausulasSelecionadas: string[],
  camposOpcionais: string[] = [],
  context?: RenderContext
): string {
  const ctx = context ?? createRenderContext();
  let result = template;

  // === PASSO 1: substitui `{{clausula:id}}` ================================
  result = result.replace(/\{\{\s*clausula:([a-zA-Z0-9_-]+)\s*\}\}/g, (_match, id: string) => {
    if (!clausulasSelecionadas.includes(id)) return "";
    const cl = clausulaPorId[id];
    return cl ? cl.corpo : "";
  });

  // Tratamento da tag {{sem_garantia}} para contrato de locação
  if (result.includes("{{sem_garantia}}")) {
    const temGarantiaSelecionada = clausulasSelecionadas.some((id) =>
      ["caucao", "fiador", "seguro_fianca"].includes(id)
    );
    if (!temGarantiaSelecionada) {
      result = result.replace(
        "{{sem_garantia}}",
        "As partes pactuam a presente locação SEM QUALQUER MODALIDADE DE GARANTIA LOCATÍCIA, nos termos do art. 42 da Lei nº 8.245/1991, ficando o LOCADOR autorizado a exigir o pagamento do aluguel e encargos até o sexto dia útil do mês vincendo."
      );
    } else {
      result = result.replace("{{sem_garantia}}", "");
    }
  }

  // === PASSO 2: substitui `{{key}}` por valores ==========================
  result = result.replace(/\{\{\s*([^}:][^}]*?)\s*\}\}/g, (_match, key: string) => {
    const k = key.trim();
    if (k === "valor_extenso") {
      const valStr = respostas["valor"] || "";
      const extenso = converterValorMoedaParaExtenso(valStr);
      return extenso ? ` (${extenso})` : "";
    }
    let valor = respostas[k];
    if (valor && valor.trim()) {
      // Normaliza siglas ou formatos de estado civil para formato por extenso minúsculo
      if (k.endsWith("_estado_civil")) {
        const v = valor.trim().toUpperCase();
        if (v === "SO" || v === "SOLTEIRO" || v === "SOLTEIRA") valor = "solteiro(a)";
        else if (v === "CA" || v === "CASADO" || v === "CASADA") valor = "casado(a)";
        else if (v === "DIV" || v === "DIVORCIADO" || v === "DIVORCIADA") valor = "divorciado(a)";
        else if (v === "VI" || v === "VIUVO" || v === "VIUVA") valor = "viúvo(a)";
        else if (v === "UE" || v === "UNIAO ESTAVEL" || v === "UNIÃO ESTÁVEL") valor = "em união estável";
        else if (v === "SEPARADO" || v === "SEPARADA") valor = "separado(a) judicialmente";
        else valor = valor.toLowerCase();
      }
      return valor;
    }
    if (camposOpcionais.includes(k)) return "";
    return PLACEHOLDER;
  });

  // === PASSO 3: substitui [data de assinatura] por data do documento =====
  const dataHoje = ctx.documentDate.toLocaleDateString(ctx.locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ctx.timeZone,
  });
  result = result.replace(/\[data de assinatura\]/g, dataHoje);

  // === Normalização pós-preenchimento ====================================
  // Normaliza espaços antes de vírgula (ex: "Nome ," -> "Nome,")
  result = result.replace(/\s+,\s*/g, ", ");
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
  camposOpcionais: string[] = [],
  context?: RenderContext
): string | null {
  const filled = fillTemplate(template, respostas, clausulaPorId, clausulasSelecionadas, camposOpcionais, context);
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

export {
  parseMoneyToCents,
  formatMoneyFromCents,
  numberToWords,
  moneyToWords,
  converterValorMoedaParaExtenso,
  numberToWords as formatarNumeroExtenso,
} from "./money";

