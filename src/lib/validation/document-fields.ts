import type { CampoModelo } from "@/lib/types";

export type DocumentFieldValidationKind =
  | "cpf"
  | "cnpj"
  | "cep"
  | "telefone"
  | "data"
  | null;

type CampoValidavel = Pick<CampoModelo, "key" | "pergunta" | "tipo">;

/**
 * Detecta formatos que têm validação estrutural determinística.
 *
 * A chave do campo é a fonte autoritativa para documentos/endereços. Labels
 * só entram como fallback para telefone/data, preservando campos ambíguos como
 * RG cuja pergunta eventualmente mencione CPF.
 */
export function detectarTipoValidacaoCampo(
  campo: CampoValidavel
): DocumentFieldValidationKind {
  const key = campo.key.toLowerCase();
  const pergunta = campo.pergunta.toLowerCase();

  if (/(^|_)cpf($|_)/.test(key)) return "cpf";
  if (/(^|_)cnpj($|_)/.test(key)) return "cnpj";
  if (/(^|_)cep($|_)/.test(key)) return "cep";
  if (/(telefone|fone|celular|whats)/.test(key)) return "telefone";
  if (campo.tipo === "date") return "data";
  if (/(^|_)(data|nascimento)($|_)/.test(key)) return "data";

  if (/^\s*(telefone|fone|celular|whats)/.test(pergunta)) {
    return "telefone";
  }
  if (/^\s*(data|nascimento)/.test(pergunta)) return "data";

  return null;
}

export function validarCPF(cpf: string): string | null {
  const nums = cpf.replace(/\D/g, "");
  if (nums.length === 0) return "Digite o CPF.";
  if (nums.length !== 11) return "CPF deve ter 11 dígitos.";
  if (/^(\d)\1{10}$/.test(nums)) {
    return "CPF inválido (não pode ter todos os dígitos iguais).";
  }

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(nums[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(nums[9])) {
    return "CPF inválido (dígito verificador incorreto).";
  }

  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(nums[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(nums[10])) {
    return "CPF inválido (dígito verificador incorreto).";
  }
  return null;
}

export function validarCNPJ(cnpj: string): string | null {
  const nums = cnpj.replace(/\D/g, "");
  if (nums.length === 0) return "Digite o CNPJ.";
  if (nums.length !== 14) return "CNPJ deve ter 14 dígitos.";
  if (/^(\d)\1{13}$/.test(nums)) return "CNPJ inválido.";

  const calcularDigito = (length: 12 | 13): number => {
    const pesos =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < length; i++) soma += Number(nums[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  if (calcularDigito(12) !== Number(nums[12])) {
    return "CNPJ inválido (dígito verificador incorreto).";
  }
  if (calcularDigito(13) !== Number(nums[13])) {
    return "CNPJ inválido (dígito verificador incorreto).";
  }
  return null;
}

export function validarCEP(cep: string): string | null {
  const nums = cep.replace(/\D/g, "");
  if (nums.length === 0) return "Digite o CEP.";
  if (nums.length !== 8) return "CEP deve ter 8 dígitos.";
  return null;
}

export function validarTelefone(telefone: string): string | null {
  const nums = telefone.replace(/\D/g, "");
  if (nums.length === 0) return "Digite o telefone.";
  if (nums.length < 10) {
    return "Telefone incompleto (precisa do DDD + número).";
  }
  if (nums.length > 11) return "Telefone longo demais.";
  if (nums.length === 11 && nums[2] !== "9") {
    return "Celular deve começar com 9 após o DDD.";
  }
  return null;
}

export function validarData(data: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  if (!match) return "Use o formato DD/MM/AAAA.";

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);
  if (mes < 1 || mes > 12) return "Mês inválido.";
  if (dia < 1 || dia > 31) return "Dia inválido.";
  if (ano < 1900 || ano > new Date().getFullYear()) return "Ano inválido.";

  const parsed = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    parsed.getUTCFullYear() !== ano ||
    parsed.getUTCMonth() !== mes - 1 ||
    parsed.getUTCDate() !== dia
  ) {
    return "Data inválida.";
  }
  return null;
}

export function validarCampoDocumento(
  campo: CampoValidavel,
  valor: string
): string | null {
  if (!valor.trim()) return null;

  switch (detectarTipoValidacaoCampo(campo)) {
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
