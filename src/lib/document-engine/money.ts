/**
 * Pipeline Monetário Canônico em Centavos (DocFacil V1).
 *
 * Separação estrita:
 * Entrada (string do form) → parseMoneyToCents() → inteiro de centavos → formatadores
 */

/**
 * Converte formatos monetários brasileiros para um número inteiro canônico de centavos.
 *
 * Formatos válidos aceitos:
 * - "1500"       → 150000 centavos (R$ 1.500,00)
 * - "1500,50"    → 150050 centavos (R$ 1.500,50)
 * - "1.500"      → 150000 centavos (R$ 1.500,00)
 * - "1.500,50"   → 150050 centavos (R$ 1.500,50)
 * - "R$ 1.500,50"→ 150050 centavos (R$ 1.500,50)
 */
export function parseMoneyToCents(raw: string): number | null {
  if (!raw || typeof raw !== "string") return null;

  // Remove prefixo R$, espaços e caracteres invisíveis
  const clean = raw.replace(/^R\$\s*/i, "").trim();
  if (!clean) return null;

  // Se contém vírgula, tratamos como separador de centavos brasileiro
  if (clean.includes(",")) {
    const parts = clean.split(",");
    if (parts.length > 2) return null; // mais de uma vírgula é inválido

    const intStr = parts[0].replace(/\./g, "").replace(/\D/g, "");
    const decStr = parts[1].replace(/\D/g, "");

    if (!intStr && !decStr) return null;

    const intVal = intStr ? parseInt(intStr, 10) : 0;
    // Pega até 2 dígitos de centavos
    const decVal = decStr ? parseInt(decStr.padEnd(2, "0").slice(0, 2), 10) : 0;

    if (isNaN(intVal) || isNaN(decVal)) return null;
    return intVal * 100 + decVal;
  }

  // Se contém apenas pontos: pode ser separador de milhar (ex: "1.500" ou "350.000")
  if (clean.includes(".")) {
    const parts = clean.split(".");
    // Se cada parte após o primeiro ponto tem exatamente 3 dígitos, é milhar puro (ex: "1.500", "350.000")
    const isThousandGrouping = parts.slice(1).every((p) => p.length === 3 && /^\d{3}$/.test(p));
    if (isThousandGrouping) {
      const numOnly = clean.replace(/\./g, "");
      const val = parseInt(numOnly, 10);
      return isNaN(val) ? null : val * 100;
    }
  }

  // Número puro sem separadores decimais (ex: "1500" -> R$ 1.500,00)
  const numsOnly = clean.replace(/\D/g, "");
  if (!numsOnly) return null;
  const val = parseInt(numsOnly, 10);
  return isNaN(val) ? null : val * 100;
}

/**
 * Formata um inteiro de centavos como string monetária brasileira ("R$ 1.500,00").
 */
export function formatMoneyFromCents(cents: number): string {
  if (isNaN(cents) || cents < 0) return "R$ 0,00";
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  return `R$ ${reais.toLocaleString("pt-BR")},${centavos.toString().padStart(2, "0")}`;
}

/**
 * Converte um número inteiro (0 a 999.999) para texto em português por extenso.
 */
export function numberToWords(n: number): string {
  if (n === 0) return "zero";
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezenasTeens = [
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];
  const dezenas = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];
  const centenas = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  if (n === 100) return "cem";
  if (n < 10) return unidades[n];
  if (n >= 10 && n < 20) return dezenasTeens[n - 10];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u > 0 ? `${dezenas[d]} e ${unidades[u]}` : dezenas[d];
  }
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const resto = n % 100;
    return resto > 0 ? `${centenas[c]} e ${numberToWords(resto)}` : centenas[c];
  }
  if (n < 1000000) {
    const mil = Math.floor(n / 1000);
    const resto = n % 1000;
    const prefixo = mil === 1 ? "um mil" : `${numberToWords(mil)} mil`;
    if (resto === 0) return prefixo;
    if (resto % 100 === 0 || resto < 100) {
      return `${prefixo} e ${numberToWords(resto)}`;
    }
    return `${prefixo} ${numberToWords(resto)}`;
  }
  return n.toLocaleString("pt-BR");
}

/**
 * Converte um inteiro de centavos em texto monetário por extenso ("um mil e quinhentos reais").
 */
export function moneyToWords(cents: number): string {
  if (isNaN(cents) || cents <= 0) return "";
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;

  let extensoReais = "";
  if (reais > 0) {
    const nomeReais = reais === 1 ? "real" : "reais";
    extensoReais = `${numberToWords(reais)} ${nomeReais}`;
  }

  let extensoCentavos = "";
  if (centavos > 0) {
    const nomeCentavos = centavos === 1 ? "centavo" : "centavos";
    extensoCentavos = `${numberToWords(centavos)} ${nomeCentavos}`;
  }

  if (extensoReais && extensoCentavos) {
    return `${extensoReais} e ${extensoCentavos}`;
  }
  return extensoReais || extensoCentavos;
}

/**
 * Função helper que integra o parsing de string e conversão para extenso.
 */
export function converterValorMoedaParaExtenso(valorStr: string): string {
  const cents = parseMoneyToCents(valorStr);
  if (cents === null || cents <= 0) return "";
  return moneyToWords(cents);
}
