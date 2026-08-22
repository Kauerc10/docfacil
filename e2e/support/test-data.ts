export const VALID_CPFS = [
  "111.444.777-35",
  "529.982.247-25",
  "935.411.347-80",
  "987.654.321-00",
] as const;

export const DEFAULT_FIELD_VALUES: Record<string, string> = {
  cep: "01310-100",
  rua: "Avenida Paulista",
  numero: "1500",
  complemento: "Sala 12",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "SP",
  estado: "SP",
  rg: "12.345.678-9",
  profissao: "Analista de sistemas",
  prazo: "30",
  dia_vencimento: "10",
  valor: "3500,00",
  preco: "3500,00",
  telefone: "11999999999",
  email: "e2e@docfacil.test",
};

export function valueForField(key: string, index = 0): string {
  const normalized = key.toLowerCase();

  if (normalized.includes("cpf")) {
    return VALID_CPFS[index % VALID_CPFS.length] ?? VALID_CPFS[0];
  }
  if (normalized.includes("cep")) return DEFAULT_FIELD_VALUES.cep;
  if (normalized.includes("rua") || normalized.includes("logradouro")) {
    return DEFAULT_FIELD_VALUES.rua;
  }
  if (normalized.includes("numero")) return DEFAULT_FIELD_VALUES.numero;
  if (normalized.includes("complemento")) return DEFAULT_FIELD_VALUES.complemento;
  if (normalized.includes("bairro")) return DEFAULT_FIELD_VALUES.bairro;
  if (normalized.includes("cidade") || normalized.includes("municipio")) {
    return DEFAULT_FIELD_VALUES.cidade;
  }
  if (/(^|_)(uf|estado)($|_)/.test(normalized)) return DEFAULT_FIELD_VALUES.uf;
  if (normalized.includes("rg")) return DEFAULT_FIELD_VALUES.rg;
  if (normalized.includes("profissao")) return DEFAULT_FIELD_VALUES.profissao;
  if (normalized.includes("prazo") || normalized.includes("meses")) return DEFAULT_FIELD_VALUES.prazo;
  if (normalized.includes("vencimento")) return DEFAULT_FIELD_VALUES.dia_vencimento;
  if (normalized.includes("valor") || normalized.includes("preco") || normalized.includes("aluguel")) {
    return DEFAULT_FIELD_VALUES.valor;
  }
  if (normalized.includes("telefone") || normalized.includes("celular")) {
    return DEFAULT_FIELD_VALUES.telefone;
  }
  if (normalized.includes("email")) return DEFAULT_FIELD_VALUES.email;
  if (normalized.includes("data")) return "01/08/2026";
  if (normalized.includes("forma_pagamento")) return "PIX";
  if (normalized.includes("finalidade")) return "Comprovação documental para fins administrativos";
  if (normalized.includes("matricula")) return "12.345";
  if (normalized.includes("cartorio") || normalized.includes("registro")) {
    return "1º Registro de Imóveis";
  }
  if (normalized.includes("descricao")) return "Imóvel urbano descrito conforme matrícula informada";
  if (normalized.includes("nome")) return `Pessoa E2E ${index + 1}`;

  return "Informação E2E válida";
}
