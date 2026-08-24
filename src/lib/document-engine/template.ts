/**
 * Preenchimento de template — substitui `{{key}}` e `{{clausula:id}}` por
 * valores concretos.
 *
 * TWO-PASS obrigatório: cláusulas podem conter `{{key}}` dentro do seu `corpo`.
 * Primeiro injetamos a cláusula e depois interpolamos os campos internos.
 */
import type { ClausulaDinamica, EtapaModelo } from "../types";
import { type RenderContext, createRenderContext } from "./types";
import { converterValorMoedaParaExtenso } from "./money";
import { normalizeCivilStatus } from "./civil-status";

const PLACEHOLDER = "______________________";

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

  result = result.replace(/\{\{\s*clausula:([a-zA-Z0-9_-]+)\s*\}\}/g, (_match, id: string) => {
    if (!clausulasSelecionadas.includes(id)) return "";
    const cl = clausulaPorId[id];
    return cl ? cl.corpo : "";
  });

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

  result = result.replace(/\{\{\s*([^}:][^}]*?)\s*\}\}/g, (_match, key: string) => {
    const k = key.trim();
    if (k === "valor_extenso") {
      const valStr = respostas["valor"] || "";
      const extenso = converterValorMoedaParaExtenso(valStr);
      return extenso ? ` (${extenso})` : "";
    }

    let valor = respostas[k];
    if (valor && valor.trim()) {
      if (k === "estado_civil" || k.endsWith("_estado_civil")) {
        return normalizeCivilStatus(valor) ?? "";
      }

      // O label "(padrão)" pertence à ajuda da interface, não ao contrato.
      if (k === "regime") {
        valor = valor.replace(/\s*\(padrão\)\s*$/i, "").trim();
      }

      return valor;
    }

    if (camposOpcionais.includes(k)) return "";
    return PLACEHOLDER;
  });

  const dataHoje = ctx.documentDate.toLocaleDateString(ctx.locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ctx.timeZone,
  });
  result = result.replace(/\[data de assinatura\]/g, dataHoje);

  result = result.replace(/\s+,\s*/g, ", ");
  result = result.replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",");
  result = result.replace(/\s*-\s*-\s*/g, " - ").replace(/^\s*-\s*/, "").replace(/\s*-\s*$/, "");

  return result.trim();
}

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
