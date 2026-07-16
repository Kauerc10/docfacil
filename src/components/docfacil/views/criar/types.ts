/**
 * Shared types and utilities for the criar-view subcomponents and the
 * documento-detalhe-view subcomponents.
 *
 * The DocFacil "Concierge" flow is structured as a sequence of steps
 * (`EtapaModelo`). Each step is one of:
 *   - a single pergunta (one `CampoModelo`),
 *   - a group of related fields (e.g. address with CEP auto-fill), or
 *   - a set of optional dynamic clauses (`ClausulaDinamica`) the user can
 *     tick on/off, each contributing a paragraph to the document body.
 *
 * The template engine replaces `{{key}}` (regular field) and
 * `{{clausula:clauseId}}` (selected clause body) tokens.
 *
 * Mask + validation helpers live here too so both the criar flow and the
 * documento-detalhe view use the same deterministic (non-AI) rules.
 */
import type { CampoModelo, EnderecoConfig } from "@/lib/types";

// === Mascote mood (espelha o tipo interno do pet.tsx) ===
export type PetMood = "idle" | "falando" | "feliz" | "atencao" | "pensando";

// === Input ref union type (single text input OR textarea OR select) ===
export type InputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export type InputRef = InputElement | null;

// === Etapa (step) of the criar flow ===
// "grupo" pode ter `endereco` configurado — quando presente, habilita
// auto-fill ViaCEP, normalização de logradouro e composição automática.
export type EtapaModelo =
  | { tipo: "pergunta"; campo: CampoModelo }
  | { tipo: "grupo"; titulo?: string; campos: CampoModelo[]; endereco?: EnderecoConfig }
  | { tipo: "clausulas"; titulo?: string; clausulas: ClausulaDinamica[] };

// === Dynamic clause (optional paragraph the user toggles) ===
export interface ClausulaDinamica {
  /** unique id used in `{{clausula:id}}` template tokens */
  id: string;
  titulo: string;
  descricao: string;
  /** body inserted into the document when the clause is selected */
  corpo: string;
  /** extra inputs shown when the clause is selected (e.g. "testemunha 1 nome") */
  camposExtras?: CampoModelo[];
}

// === Respostas estendidas (campos + clausulas selecionadas + extras) ===
export interface RespostasState {
  /** valor por chave de campo — espelha Documento.respostas */
  campos: Record<string, string>;
  /** ids das cláusulas dinâmicas selecionadas */
  clausulasSelecionadas: string[];
}

// ============================================================================
// Props das sub-componentes
// ============================================================================

export interface ChatStepProps {
  /** texto que o Pet "fala" (digitado progressivamente) */
  petText: string;
  petMood?: PetMood;
  /** etapa atual (define qual input vai aparecer embaixo do pet) */
  etapa: EtapaModelo;
  /** índice da etapa atual (0-based) */
  stepIndex: number;
  /** total de etapas (para o indicador "faltam X") */
  totalEtapas: number;
  /** respostas atuais (controladas) */
  respostas: RespostasState;
  /** callback quando o usuário digita em um campo de uma pergunta simples */
  onInputChange: (key: string, value: string) => void;
  /** callback quando o usuário altera um campo dentro de um grupo */
  onGrupoFieldChange: (grupoKey: string, fieldKey: string, value: string) => void;
  /** callback quando o usuário marca/desmarca uma cláusula ou altera um campo extra */
  onClausulaFieldChange: (
    clausulaId: string,
    payload:
      | { tipo: "toggle"; selecionada: boolean }
      | { tipo: "extra"; fieldKey: string; value: string }
  ) => void;
  /** avança para a próxima etapa (ou finaliza) */
  onAvancar: () => void;
  /** true quando estamos na última etapa */
  isLast: boolean;
  /** true enquanto o documento está sendo salvo (botão mostra "Salvando…") */
  submitting?: boolean;
  /** erro de validação vindo do parent (obrigatório) — exibido no CampoPergunta */
  fieldError?: string | null;
  /** extras de cláusulas por id — repassado ao ClausulasPergunta para refletir valores */
  extrasPorClausula?: Record<string, Record<string, string>>;
  /** callback quando o usuário clica no balão do pet (skip typing) */
  onSkipTyping?: () => void;
}

export interface CampoPerguntaProps {
  campo: CampoModelo;
  value: string;
  onChange: (value: string) => void;
  onAvancar: () => void;
  submitting?: boolean;
  /** quando true, o botão mostra "Finalizar" em vez de "Avançar" */
  isLast?: boolean;
  /** erro de validação opcional (string exibida abaixo do campo) */
  erro?: string | null;
}

export interface ClausulasPerguntaProps {
  clausulas: ClausulaDinamica[];
  selecionadas: string[];
  extras: Record<string, Record<string, string>>;
  onToggle: (clausulaId: string, selecionada: boolean) => void;
  onExtraChange: (clausulaId: string, fieldKey: string, value: string) => void;
  onAvancar: () => void;
  isLast?: boolean;
  submitting?: boolean;
}

export interface ClausulaCardProps {
  clausula: ClausulaDinamica;
  selecionada: boolean;
  extras: Record<string, string>;
  onToggle: (selecionada: boolean) => void;
  onExtraChange: (fieldKey: string, value: string) => void;
}

export interface PreviewA4Props {
  titulo: string;
  corpo: string[];
  respostas: Record<string, string>;
  /** IDs das cláusulas dinâmicas selecionadas (injetadas via `{{clausula:id}}`) */
  clausulasSelecionadas?: string[];
  /** modelo (usado para composição de endereço e definição de cláusulas) */
  modelo?: import("@/lib/types").Modelo;
  /** campos opcionais que, quando vazios, viram string vazia em vez de "_____" */
  camposOpcionais?: string[];
  /** doc id exibido no canto superior (quando aplicável) */
  docId?: string;
  /** quando false, esconde o badge "ao vivo" */
  showLiveBadge?: boolean;
  /** quando false, esconde o selo marca d'água */
  showWatermark?: boolean;
  /** className extra no root (sheet) */
  className?: string;
}

// ============================================================================
// Detecção de máscara (key autoritativa, pergunta como fallback)
// ============================================================================

/**
 * Detecta o tipo de máscara a aplicar a um campo.
 *
 * 1. KEY é a fonte autoritativa — só aplica máscara CPF/CNPJ/CEP se a key
 *    explicitamente diz isso. Evita falso positivo em campos como
 *    "Seu RG e CPF (opcional):" (key "rg") — a menção a "CPF" no label
 *    não significa que o campo deva ter máscara de CPF.
 * 2. PERGUNTA — só para casos onde a key não ajuda (ex.: "telefone"
 *    aparece no label mas a key é "contato"). Stricter: a pergunta
 *    precisa começar com a palavra-chave (não apenas conter).
 * 3. tipo "number" → numero; senão texto.
 */
export function detectarMascara(c: CampoModelo): TipoMascara {
  const k = c.key.toLowerCase();
  const p = c.pergunta.toLowerCase();
  if (/cpf/.test(k)) return "cpf";
  if (/cnpj/.test(k)) return "cnpj";
  if (/cep/.test(k)) return "cep";
  if (/telefone|fone|celular|whats/.test(k)) return "telefone";
  if (/data|nascimento/.test(k)) return "data";
  if (/_uf$|^uf$|estado/.test(k)) return "estado";
  if (/^\s*(telefone|fone|celular|whats)/.test(p)) return "telefone";
  if (/^\s*(data|nascimento)/.test(p)) return "data";
  if (/sigla do estado/.test(p)) return "estado";
  if (c.tipo === "number") return "numero";
  return "texto";
}

// ============================================================================
// Máscaras determinísticas (espelham normalizers.ts onde aplicável)
// ============================================================================

export type TipoMascara = "cpf" | "cnpj" | "cep" | "telefone" | "data" | "estado" | "numero" | "texto";

/** Aplica a máscara apropriada para o tipo. Texto/numero = passa direto. */
export function aplicarMascara(valor: string, tipo: TipoMascara): string {
  const nums = valor.replace(/\D/g, "");
  switch (tipo) {
    case "cpf":
      return aplicarMascaraCPF(nums);
    case "cnpj":
      return aplicarMascaraCNPJ(nums);
    case "cep":
      return nums.length <= 5 ? nums : `${nums.slice(0, 5)}-${nums.slice(5, 8)}`;
    case "telefone":
      return aplicarMascaraTelefone(nums);
    case "data":
      return aplicarMascaraData(nums);
    case "estado":
      // máscara não aplica — só normaliza para maiúsculas e limita 2 chars
      return valor.toUpperCase().slice(0, 2).replace(/[^A-Z]/g, "");
    case "numero":
      // mantém dígitos, vírgula, ponto
      return valor.replace(/[^0-9.,]/g, "");
    case "texto":
    default:
      return valor;
  }
}

function aplicarMascaraCPF(nums: string): string {
  const s = nums.slice(0, 11);
  if (s.length <= 3) return s;
  if (s.length <= 6) return `${s.slice(0, 3)}.${s.slice(3)}`;
  if (s.length <= 9) return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6)}`;
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

function aplicarMascaraCNPJ(nums: string): string {
  const s = nums.slice(0, 14);
  if (s.length <= 2) return s;
  if (s.length <= 5) return `${s.slice(0, 2)}.${s.slice(2)}`;
  if (s.length <= 8) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5)}`;
  if (s.length <= 12) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8)}`;
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}

function aplicarMascaraTelefone(nums: string): string {
  const s = nums.slice(0, 11);
  if (s.length <= 2) return s;
  if (s.length <= 6) return `(${s.slice(0, 2)}) ${s.slice(2)}`;
  if (s.length <= 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
  return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
}

function aplicarMascaraData(nums: string): string {
  const s = nums.slice(0, 8);
  if (s.length <= 2) return s;
  if (s.length <= 4) return `${s.slice(0, 2)}/${s.slice(2)}`;
  return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`;
}

// ============================================================================
// Validadores (retornam mensagem de erro em PT-BR, ou null se válido)
// ============================================================================

/** Valida CPF (formatação + dígitos verificadores). */
export function validarCPF(cpf: string): string | null {
  const nums = cpf.replace(/\D/g, "");
  if (nums.length === 0) return "Digite o CPF.";
  if (nums.length !== 11) return "CPF deve ter 11 dígitos.";
  if (/^(\d)\1{10}$/.test(nums)) return "CPF inválido (não pode ter todos os dígitos iguais).";
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[9], 10)) return "CPF inválido (dígito verificador incorreto).";
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[10], 10)) return "CPF inválido (dígito verificador incorreto).";
  return null;
}

/** Valida CNPJ (formatação + dígitos verificadores). */
export function validarCNPJ(cnpj: string): string | null {
  const nums = cnpj.replace(/\D/g, "");
  if (nums.length === 0) return "Digite o CNPJ.";
  if (nums.length !== 14) return "CNPJ deve ter 14 dígitos.";
  if (/^(\d)\1{13}$/.test(nums)) return "CNPJ inválido.";
  const calc = (len: number): number => {
    const pesos = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = 0;
    for (let i = 0; i < len; i++) s += parseInt(nums[i], 10) * pesos[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(12);
  if (d1 !== parseInt(nums[12], 10)) return "CNPJ inválido (dígito verificador incorreto).";
  const d2 = calc(13);
  if (d2 !== parseInt(nums[13], 10)) return "CNPJ inválido (dígito verificador incorreto).";
  return null;
}

/** Valida CEP (apenas formato: 8 dígitos). */
export function validarCEP(cep: string): string | null {
  const nums = cep.replace(/\D/g, "");
  if (nums.length === 0) return "Digite o CEP.";
  if (nums.length !== 8) return "CEP deve ter 8 dígitos.";
  return null;
}

/** Valida telefone (10 ou 11 dígitos com DDD). */
export function validarTelefone(tel: string): string | null {
  const nums = tel.replace(/\D/g, "");
  if (nums.length === 0) return "Digite o telefone.";
  if (nums.length < 10) return "Telefone incompleto (precisa do DDD + número).";
  if (nums.length > 11) return "Telefone longo demais.";
  // DDD 11 dígitos: celular (começa com 9 após DDD); 10 dígitos: fixo
  if (nums.length === 11 && nums[2] !== "9") return "Celular deve começar com 9 após o DDD.";
  return null;
}

/** Valida data no formato DD/MM/AAAA (e checagem básica de sanidade). */
export function validarData(data: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  if (!m) return "Use o formato DD/MM/AAAA.";
  const [, dd, mm, aaaa] = m;
  const d = parseInt(dd, 10);
  const mes = parseInt(mm, 10);
  const ano = parseInt(aaaa, 10);
  if (mes < 1 || mes > 12) return "Mês inválido.";
  if (d < 1 || d > 31) return "Dia inválido.";
  if (ano < 1900 || ano > new Date().getFullYear()) return "Ano inválido.";
  return null;
}

/**
 * Valida um campo de acordo com o TipoMascara detectado.
 * Retorna mensagem de erro em PT-BR, ou null se válido/vazio.
 * (Campos vazios retornam null — o check de obrigatório é no submit.)
 */
export function validarPorTipo(tipo: TipoMascara, valor: string): string | null {
  if (!valor.trim()) return null;
  switch (tipo) {
    case "cpf": return validarCPF(valor);
    case "cnpj": return validarCNPJ(valor);
    case "cep": return validarCEP(valor);
    case "telefone": return validarTelefone(valor);
    case "data": return validarData(valor);
    default: return null;
  }
}
