/**
 * Sistema de normalização/autocorreção para campos de formulário.
 * Determinístico (não-IA): instantâneo, gratuito, 100% confiável, offline.
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
