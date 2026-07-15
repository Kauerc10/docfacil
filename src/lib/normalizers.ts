/**
 * Sistema de normalização/autocorreção para campos de formulário.
 * Determinístico (não-IA): instantâneo, gratuito, 100% confiável, offline.
 *
 * NOTA: A composição de endereço (composeEndereco) e a aplicação de composição
 * a partir das etapas do modelo (aplicarComposicaoModelo) foram movidas para
 * `lib/document-engine/compose.ts` — single source of truth para todos os
 * renderers (PreviewA4, DetalhePreview, PDF). Aqui ficam apenas as
 * normalizações de campo único (estado, logradouro, data, CPF, CNPJ, CEP,
 * telefone) usadas pelos inputs durante a digitação.
 */

const ESTADOS_MAP: Record<string, string> = {
  AC:"AC",AL:"AL",AP:"AP",AM:"AM",BA:"BA",CE:"CE",DF:"DF",ES:"ES",GO:"GO",MA:"MA",MT:"MT",MS:"MS",MG:"MG",PA:"PA",PB:"PB",PR:"PR",PE:"PE",PI:"PI",RJ:"RJ",RN:"RN",RS:"RS",RO:"RO",RR:"RR",SC:"SC",SP:"SP",SE:"SE",TO:"TO",
  "acre":"AC","alagoas":"AL","amapá":"AP","amapa":"AP","amazonas":"AM","bahia":"BA","ceará":"CE","ceara":"CE","distrito federal":"DF","espírito santo":"ES","espirito santo":"ES","goiás":"GO","goias":"GO","maranhão":"MA","maranhao":"MA","mato grosso":"MT","mato grosso do sul":"MS","minas gerais":"MG","pará":"PA","para":"PA","paraíba":"PB","paraiba":"PB","paraná":"PR","parana":"PR","pernambuco":"PE","piauí":"PI","piaui":"PI","rio de janeiro":"RJ","rio grande do norte":"RN","rio grande do sul":"RS","rondônia":"RO","rondonia":"RO","roraima":"RR","santa catarina":"SC","são paulo":"SP","sao paulo":"SP","sergipe":"SE","tocantins":"TO",
};

export function normalizarEstado(entrada: string): string {
  const limpo = entrada.trim().toLowerCase().replace(/[./]+$/, "");
  if (limpo.length === 2 && ESTADOS_MAP[limpo.toUpperCase()]) return ESTADOS_MAP[limpo.toUpperCase()];
  if (ESTADOS_MAP[limpo]) return ESTADOS_MAP[limpo];
  const matchSigla = entrada.match(/\b([A-Z]{2})\b/);
  if (matchSigla && ESTADOS_MAP[matchSigla[1]]) return matchSigla[1];
  return entrada;
}

export function validarEstado(entrada: string): string | null {
  const normalizado = normalizarEstado(entrada);
  if (normalizado.length === 2 && ESTADOS_MAP[normalizado]) return null;
  return "Estado não reconhecido. Digite a sigla (ex: SP) ou o nome (ex: São Paulo).";
}

// ============================================================================
// LOGRADOURO (RUA) — normalização de prefixo
// ============================================================================
//
// Quando o usuário digita "rua arnoldo beck" ou "Arnoldo Beck" no campo de
// rua, queremos normalizar para que o documento final sempre tenha o prefixo
// correto, sem repetir ("Rua Rua Arnoldo Beck") e sem faltar ("arnoldo beck").
//
// Estratégia:
//  1. Detecta se o primeiro token é um tipo de logradouro conhecido
//     (rua, avenida, av, travessa, alameda, praça, rodovia, estrada, via,
//     largo, beco, viela, quadra).
//  2. Se sim, normaliza para a forma canônica ("Rua", "Avenida", "Travessa",
//     "Alameda", "Praça", "Rodovia", "Estrada", "Via", "Largo", "Beco",
//     "Viela", "Quadra") e mantém o restante do texto em Title Case
//     (preservando conectivos como "da", "de", "das", "dos", "e").
//  3. Se não, assume "Rua" como prefixo padrão (mais comum no Brasil) e
//     aplica Title Case no que o usuário digitou.
//
// Exemplos:
//   "rua arnoldo beck"        → "Rua Arnoldo Beck"
//   "ARNOLDO BECK"            → "Rua Arnoldo Beck"   (default "Rua")
//   "avenida paulista"        → "Avenida Paulista"
//   "av. paulista"            → "Avenida Paulista"
//   "praça da sé"             → "Praça da Sé"
//   "travessa das flores"     → "Travessa das Flores"
//   "Rua das Flores"          → "Rua das Flores"     (já normalizado)
//   ""                        → ""

const TIPOS_LOGRADOURO: Record<string, string> = {
  "rua": "Rua",
  "r": "Rua",
  "avenida": "Avenida",
  "av": "Avenida",
  "av.": "Avenida",
  "alameda": "Alameda",
  "travessa": "Travessa",
  "tv": "Travessa",
  "tv.": "Travessa",
  "praca": "Praça",
  "praça": "Praça",
  "pça": "Praça",
  "pça.": "Praça",
  "rodovia": "Rodovia",
  "rod": "Rodovia",
  "rod.": "Rodovia",
  "estrada": "Estrada",
  "est": "Estrada",
  "est.": "Estrada",
  "via": "Via",
  "largo": "Largo",
  "lgo": "Largo",
  "lgo.": "Largo",
  "beco": "Beco",
  "viela": "Viela",
  "quadra": "Quadra",
  "qd": "Quadra",
  "qd.": "Quadra",
};

const CONECTIVOS_MINUSCULOS = new Set([
  "da", "de", "das", "dos", "do", "e", "ao", "aos", "à", "às", "na", "no", "nas", "nos",
]);

function titleCasePreservandoConectivos(texto: string): string {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "";
  return palavras
    .map((p) => {
      const lower = p.toLowerCase();
      // conectivos sempre em minúsculas em logradouros (da, de, das, dos, e)
      if (CONECTIVOS_MINUSCULOS.has(lower)) return lower;
      // primeira letra maiúscula, resto minúscula
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Normaliza o logradouro digitado pelo usuário.
 * Veja comentários no topo da seção para exemplos e regras.
 */
export function normalizarLogradouro(entrada: string): string {
  const trim = entrada.trim();
  if (!trim) return "";

  // detecta o primeiro token
  const match = trim.match(/^(\S+)\s*(.*)$/);
  if (!match) return trim;

  const primeiroToken = match[1].toLowerCase().replace(/[.]+$/, "");
  const restante = match[2].trim();

  const tipoCanonico = TIPOS_LOGRADOURO[primeiroToken];
  if (tipoCanonico) {
    // usuário digitou um tipo conhecido — normaliza e mantém o restante
    const restoNormalizado = titleCasePreservandoConectivos(restante);
    return restoNormalizado ? `${tipoCanonico} ${restoNormalizado}` : tipoCanonico;
  }

  // usuário não digitou tipo — assume "Rua" + Title Case do que digitou
  return `Rua ${titleCasePreservandoConectivos(trim)}`;
}

/**
 * Detecta se o usuário já digitou um prefixo de logradouro (Rua, Avenida, etc.).
 * Útil para mostrar dicas visuais no input.
 */
export function temPrefixoLogradouro(entrada: string): boolean {
  const trim = entrada.trim();
  if (!trim) return false;
  const primeiroToken = trim.match(/^(\S+)/)?.[1]?.toLowerCase().replace(/[.]+$/, "");
  return !!primeiroToken && !!TIPOS_LOGRADOURO[primeiroToken];
}

// ============================================================================
// COMPOSIÇÃO DE ENDEREÇO — movida para lib/document-engine/compose.ts
// ============================================================================
// As funções composeEndereco, aplicarComposicaoModelo e helpers de cláusulas
// agora vivem em lib/document-engine/compose.ts (single source of truth).
// Importe de lá:
//   import { composeEndereco, aplicarComposicaoModelo } from "@/lib/document-engine";

export function normalizarData(entrada: string): string {
  const nums = entrada.replace(/\D/g, "");
  if (nums.length === 8) return `${nums.slice(0,2)}/${nums.slice(2,4)}/${nums.slice(4)}`;
  return entrada;
}

export function normalizarCPF(entrada: string): string {
  const nums = entrada.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0,3)}.${nums.slice(3)}`;
  if (nums.length <= 9) return `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6)}`;
  return `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6,9)}-${nums.slice(9)}`;
}

export function normalizarCNPJ(entrada: string): string {
  const nums = entrada.replace(/\D/g, "").slice(0, 14);
  if (nums.length <= 2) return nums;
  if (nums.length <= 5) return `${nums.slice(0,2)}.${nums.slice(2)}`;
  if (nums.length <= 8) return `${nums.slice(0,2)}.${nums.slice(2,5)}.${nums.slice(5)}`;
  if (nums.length <= 12) return `${nums.slice(0,2)}.${nums.slice(2,5)}.${nums.slice(5,8)}/${nums.slice(8)}`;
  return `${nums.slice(0,2)}.${nums.slice(2,5)}.${nums.slice(5,8)}/${nums.slice(8,12)}-${nums.slice(12)}`;
}

export function normalizarCEP(entrada: string): string {
  const nums = entrada.replace(/\D/g, "").slice(0, 8);
  if (nums.length <= 5) return nums;
  return `${nums.slice(0,5)}-${nums.slice(5)}`;
}

export function normalizarTelefone(entrada: string): string {
  const nums = entrada.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2) return nums;
  if (nums.length <= 6) return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
  if (nums.length <= 10) return `(${nums.slice(0,2)}) ${nums.slice(2,6)}-${nums.slice(6)}`;
  return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`;
}
