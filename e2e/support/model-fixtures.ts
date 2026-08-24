export const OFFICIAL_MODEL_SLUGS = [
  "declaracao-residencia",
  "declaracao-residencia-terceiro",
  "contrato-locacao",
  "contrato-locacao-comercial",
  "contrato-compra-venda-imovel",
  "comodato",
  "compra-venda",
  "uniao-estavel",
  "procuracao-simples",
] as const;

export type OfficialModelSlug = (typeof OFFICIAL_MODEL_SLUGS)[number];

export interface OfficialModelFixture {
  fieldValues: Record<string, string>;
  residents?: Array<{ nome: string; cpf: string }>;
  rentalGuarantee?: string;
  clauseExtras?: Record<string, string>;
}

export const OFFICIAL_MODEL_FIXTURES: Record<OfficialModelSlug, OfficialModelFixture> = {
  "declaracao-residencia": {
    fieldValues: {
      declarante_nome: "Marina de Souza Oliveira",
      finalidade: "Comprovação de residência para fins cadastrais",
    },
  },
  "declaracao-residencia-terceiro": {
    fieldValues: {
      declarante_nome: "Carlos Henrique Lima",
      residente_nome: "Ana Beatriz Lima",
    },
  },
  "contrato-locacao": {
    fieldValues: {
      locador_nome: "Helena Martins de Almeida",
      locatario_nome: "Rafael Augusto Pereira",
    },
    residents: [],
    rentalGuarantee: "Sem garantia",
  },
  "contrato-locacao-comercial": {
    fieldValues: {
      locador_nome: "Roberto Carlos Ferreira",
      locatario_nome: "Fernanda Alves Ribeiro",
    },
  },
  "contrato-compra-venda-imovel": {
    fieldValues: {
      vendedor_nome: "Sofia Andrade Moreira",
      comprador_nome: "Leonardo Pereira Costa",
      possui_sinal: "Não",
    },
  },
  comodato: {
    fieldValues: {
      comodante_nome: "Paulo Roberto da Costa",
      comodatario_nome: "Juliana Mendes Silveira",
    },
  },
  "compra-venda": {
    fieldValues: {
      vendedor_nome: "Mateus Henrique Nunes",
      comprador_nome: "Camila Rodrigues Souza",
    },
  },
  "uniao-estavel": {
    fieldValues: {
      companheiro1_nome: "Gabriel Martins Lopes",
      companheiro2_nome: "Isabela Oliveira Ramos",
    },
  },
  "procuracao-simples": {
    fieldValues: {
      outorgante_nome: "Renata Cristina Gomes",
      outorgado_nome: "Bruno Henrique Freitas",
      poderes: "Representar o outorgante perante órgãos públicos e privados para os atos descritos neste instrumento.",
    },
  },
};
