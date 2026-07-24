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

  // Trata {{sem_garantia}} caso nenhuma garantia locatícia tenha sido selecionada
  const temGarantia = clausulasSelecionadas.some((id) =>
    ["caucao", "fiador", "seguro_fianca"].includes(id)
  );
  result = result.replace(/\{\{\s*sem_garantia\s*\}\}/g, () => {
    if (temGarantia) return "";
    return "As partes declaram expressamente que o presente contrato é celebrado SEM QUALQUER MODALIDADE DE GARANTIA LOCATÍCIA, inexistindo caução, fiança, seguro-fiança ou cessão fiduciária, nos termos do art. 37 da Lei nº 8.245/1991. Em razão da ausência de garantia, fica ressalvada a faculdade prevista no art. 42 da mesma lei.";
  });

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
      // Normaliza siglas de estado civil para formato por extenso
      if (k.endsWith("_estado_civil")) {
        const v = valor.trim().toUpperCase();
        if (v === "SO" || v === "SOLTEIRO" || v === "SOLTEIRA") valor = "solteiro(a)";
        else if (v === "CA" || v === "CASADO" || v === "CASADA") valor = "casado(a)";
        else if (v === "DIV" || v === "DIVORCIADO" || v === "DIVORCIADA") valor = "divorciado(a)";
        else if (v === "VI" || v === "VIUVO" || v === "VIUVA") valor = "viúvo(a)";
        else if (v === "UE" || v === "UNIAO ESTAVEL") valor = "em união estável";
      }
      return valor;
    }
    if (camposOpcionais.includes(k)) return "";
    return PLACEHOLDER;
  });

  // === PASSO 3: substitui [data de assinatura] por data atual ============
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
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

/**
 * Converte um valor numérico ou formatado (ex: "1.000,00" ou "1000.00") em texto por extenso (PT-BR).
 */
function converterValorMoedaParaExtenso(valorStr: string): string {
  const nums = valorStr.replace(/\D/g, "");
  if (!nums) return "";
  const num = parseInt(nums, 10) / 100;
  if (isNaN(num) || num <= 0) return "";

  // Casos mais comuns para contratos de locação
  if (num === 1000) return "um mil reais";
  if (num === 1500) return "um mil e quinhentos reais";
  if (num === 2000) return "dois mil reais";
  if (num === 2500) return "dois mil e quinhentos reais";
  if (num === 3000) return "três mil reais";

  const inteiros = Math.floor(num);
  const centavos = Math.round((num - inteiros) * 100);

  const extensoInt = formatarNumeroExtenso(inteiros);
  const moeda = inteiros === 1 ? "real" : "reais";

  if (centavos > 0) {
    const extensoCent = formatarNumeroExtenso(centavos);
    const centmoeda = centavos === 1 ? "centavo" : "centavos";
    return `${extensoInt} ${moeda} e ${extensoCent} ${centmoeda}`;
  }

  return `${extensoInt} ${moeda}`;
}

function formatarNumeroExtenso(n: number): string {
  if (n === 0) return "zero";
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezenasTeens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (n === 100) return "cem";
  if (n < 10) return unidades[n];
  if (n < 20) return dezenasTeens[n - 10];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u > 0 ? `${dezenas[d]} e ${unidades[u]}` : dezenas[d];
  }
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const resto = n % 100;
    return resto > 0 ? `${centenas[c]} e ${formatarNumeroExtenso(resto)}` : centenas[c];
  }
  if (n < 1000000) {
    const mil = Math.floor(n / 1000);
    const resto = n % 1000;
    const prefixo = mil === 1 ? "um mil" : `${formatarNumeroExtenso(mil)} mil`;
    return resto > 0 ? `${prefixo} e ${formatarNumeroExtenso(resto)}` : prefixo;
  }
  return n.toLocaleString("pt-BR");
}
