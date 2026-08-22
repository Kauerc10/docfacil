import type { CampoModelo, EnderecoConfig } from "@/lib/types";
import {
  validarCEP,
  validarCNPJ,
  validarCPF,
  validarData,
  validarTelefone,
} from "@/lib/validation/document-fields";

export {
  validarCEP,
  validarCNPJ,
  validarCPF,
  validarData,
  validarTelefone,
} from "@/lib/validation/document-fields";

export type PetMood = "idle" | "falando" | "feliz" | "atencao" | "pensando";

export type InputElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;
export type InputRef = InputElement | null;

export type EtapaModelo =
  | { tipo: "pergunta"; campo: CampoModelo }
  | {
      tipo: "grupo";
      titulo?: string;
      campos: CampoModelo[];
      endereco?: EnderecoConfig;
    }
  | { tipo: "clausulas"; titulo?: string; clausulas: ClausulaDinamica[] };

export interface ClausulaDinamica {
  id: string;
  titulo: string;
  descricao: string;
  corpo: string;
  camposExtras?: CampoModelo[];
}

export interface RespostasState {
  campos: Record<string, string>;
  clausulasSelecionadas: string[];
}

export interface ChatStepProps {
  petText: string;
  petMood?: PetMood;
  etapa: EtapaModelo;
  stepIndex: number;
  totalEtapas: number;
  respostas: RespostasState;
  onInputChange: (key: string, value: string) => void;
  onGrupoFieldChange: (
    grupoKey: string,
    fieldKey: string,
    value: string
  ) => void;
  onClausulaFieldChange: (
    clausulaId: string,
    payload:
      | { tipo: "toggle"; selecionada: boolean }
      | { tipo: "extra"; fieldKey: string; value: string }
  ) => void;
  onAvancar: () => void;
  isLast: boolean;
  submitting?: boolean;
  fieldError?: string | null;
  extrasPorClausula?: Record<string, Record<string, string>>;
  onSkipTyping?: () => void;
}

export interface CampoPerguntaProps {
  campo: CampoModelo;
  value: string;
  onChange: (value: string) => void;
  onAvancar: () => void;
  submitting?: boolean;
  isLast?: boolean;
  erro?: string | null;
}

export interface ClausulasPerguntaProps {
  clausulas: ClausulaDinamica[];
  selecionadas: string[];
  extras: Record<string, Record<string, string>>;
  onToggle: (clausulaId: string, selecionada: boolean) => void;
  onExtraChange: (
    clausulaId: string,
    fieldKey: string,
    value: string
  ) => void;
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

export interface PdfPreviewProps {
  modelo: import("@/lib/types").Modelo;
  respostas: Record<string, string>;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
  authenticated: boolean;
}

export type TipoMascara =
  | "cpf"
  | "cnpj"
  | "cep"
  | "telefone"
  | "data"
  | "estado"
  | "numero"
  | "moeda"
  | "texto";

/**
 * Detecta a máscara de edição. A key é autoritativa para identificadores;
 * pergunta funciona somente como fallback estrito para telefone/data.
 */
export function detectarMascara(campo: CampoModelo): TipoMascara {
  const key = campo.key.toLowerCase();
  const pergunta = campo.pergunta.toLowerCase();

  if (/cpf/.test(key)) return "cpf";
  if (/cnpj/.test(key)) return "cnpj";
  if (/cep/.test(key)) return "cep";
  if (/telefone|fone|celular|whats/.test(key)) return "telefone";
  if (/data|nascimento/.test(key)) return "data";
  if (/_uf$|^uf$|estado/.test(key)) return "estado";
  if (/meses|prazo|dia_vencimento|quantidade|dias/.test(key)) {
    return "numero";
  }
  if (
    /valor|honorar|preco|multa|deposito/.test(key) ||
    (key.includes("caucao") && !key.includes("meses"))
  ) {
    return "moeda";
  }
  if (/r\$/.test(pergunta)) return "moeda";
  if (/^\s*(telefone|fone|celular|whats)/.test(pergunta)) {
    return "telefone";
  }
  if (/^\s*(data|nascimento)/.test(pergunta)) return "data";
  if (/sigla do estado/.test(pergunta)) return "estado";
  if (campo.tipo === "number") return "numero";
  return "texto";
}

export function aplicarMascara(valor: string, tipo: TipoMascara): string {
  const nums = valor.replace(/\D/g, "");
  switch (tipo) {
    case "cpf":
      return aplicarMascaraCPF(nums);
    case "cnpj":
      return aplicarMascaraCNPJ(nums);
    case "cep":
      return nums.length <= 5
        ? nums
        : `${nums.slice(0, 5)}-${nums.slice(5, 8)}`;
    case "telefone":
      return aplicarMascaraTelefone(nums);
    case "data":
      return aplicarMascaraData(nums);
    case "estado":
      return valor.toUpperCase().slice(0, 2).replace(/[^A-Z]/g, "");
    case "moeda":
      return aplicarMascaraMoeda(nums);
    case "numero":
      return valor.replace(/\D/g, "");
    case "texto":
    default:
      return valor;
  }
}

function aplicarMascaraCPF(nums: string): string {
  const value = nums.slice(0, 11);
  if (value.length <= 3) return value;
  if (value.length <= 6) return `${value.slice(0, 3)}.${value.slice(3)}`;
  if (value.length <= 9) {
    return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
  }
  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
}

function aplicarMascaraCNPJ(nums: string): string {
  const value = nums.slice(0, 14);
  if (value.length <= 2) return value;
  if (value.length <= 5) return `${value.slice(0, 2)}.${value.slice(2)}`;
  if (value.length <= 8) {
    return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5)}`;
  }
  if (value.length <= 12) {
    return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8)}`;
  }
  return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
}

function aplicarMascaraTelefone(nums: string): string {
  const value = nums.slice(0, 11);
  if (value.length <= 2) return value;
  if (value.length <= 6) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
  if (value.length <= 10) {
    return `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
  }
  return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
}

function aplicarMascaraData(nums: string): string {
  const value = nums.slice(0, 8);
  if (value.length <= 2) return value;
  if (value.length <= 4) return `${value.slice(0, 2)}/${value.slice(2)}`;
  return `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
}

function aplicarMascaraMoeda(nums: string): string {
  const value = nums.slice(0, 13);
  if (value.length === 0) return "";

  const padded = value.padStart(3, "0");
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);
  const intClean = intPart.replace(/^0+/, "") || "0";
  const intFormatted = intClean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intFormatted},${decPart}`;
}

/** Compatibilidade para consumidores antigos baseados na máscara visual. */
export function validarPorTipo(
  tipo: TipoMascara,
  valor: string
): string | null {
  if (!valor.trim()) return null;
  switch (tipo) {
    case "cpf":
      return validarCPF(valor);
    case "cnpj":
      return validarCNPJ(valor);
    case "cep":
      return validarCEP(valor);
    case "telefone":
      return validarTelefone(valor);
    case "data":
      return validarData(valor);
    default:
      return null;
  }
}
