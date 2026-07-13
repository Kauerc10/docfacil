/**
 * Catálogo de modelos de documentos do DocFacil.
 * Single source of truth — usado por Modelos, ModeloDetalhe, Criar, Dashboard.
 *
 * Cada modelo tem: slug, nome, descrição simples, categoria, tempo estimado,
 * campos que o usuário vai precisar (reduz ansiedade), e a estrutura do
 * documento (preview) com placeholders que o fluxo /criar preenche.
 */

export type Categoria = "Locação" | "Família" | "Comercial" | "Pessoal";

export type CampoModelo = {
  /** key usada para casar com o placeholder no template */
  key: string;
  pergunta: string;
  placeholder?: string;
  microcopy?: string;
  tipo?: "text" | "textarea" | "date" | "number";
};

export type Modelo = {
  slug: string;
  nome: string;
  desc: string;
  quandoUsar: string;
  categoria: Categoria;
  minutos: number;
  popular?: boolean;
  icone: "key" | "home" | "handshake" | "family" | "receipt" | "seal";
  campos: CampoModelo[];
  /** Template do documento — {{key}} é substituído pelo valor preenchido */
  template: {
    titulo: string;
    corpo: string[];
  };
};

export const MODELOS: Modelo[] = [
  {
    slug: "contrato-locacao",
    nome: "Contrato de Locação",
    desc: "Para alugar imóvel com segurança entre as partes.",
    quandoUsar:
      "Use quando você vai alugar um imóvel (residencial ou comercial) e precisa de um contrato formal entre locador e locatário.",
    categoria: "Locação",
    minutos: 4,
    popular: true,
    icone: "key",
    campos: [
      { key: "locador", pergunta: "Qual o nome completo de quem está alugando o imóvel (locador)?", placeholder: "Ex: Maria Aparecida da Silva", microcopy: "Pode copiar direto do RG, sem abreviar." },
      { key: "locatario", pergunta: "E o nome completo de quem vai alugar (locatário)?", placeholder: "Ex: João Pereira Santos" },
      { key: "imovel", pergunta: "Qual o endereço completo do imóvel?", placeholder: "Rua, número, bairro, cidade/UF", microcopy: "Inclua CEP se tiver." },
      { key: "valor", pergunta: "Qual o valor mensal do aluguel?", placeholder: "Ex: 1.450,00", tipo: "number" },
      { key: "prazo", pergunta: "Por quantos meses será a locação?", placeholder: "Ex: 30", tipo: "number" },
    ],
    template: {
      titulo: "CONTRATO DE LOCAÇÃO",
      corpo: [
        "Pelo presente instrumento particular, {{locador}}, doravante denominado(a) LOCADOR(A), loca para {{locatario}}, doravante LOCATÁRIO(A), o imóvel situado em {{imovel}}.",
        "A locação tem prazo de {{prazo}} meses, com início na data da assinatura, e valor mensal de R$ {{valor}}.",
        "O LOCATÁRIO obriga-se a pagar o aluguel até o dia 5 de cada mês, sob pena de multa de 10%.",
      ],
    },
  },
  {
    slug: "declaracao-residencia",
    nome: "Declaração de Residência",
    desc: "Comprove onde mora para bancos, escolas e órgãos.",
    quandoUsar:
      "Use quando um banco, escola ou órgão público pedir comprovante de residência e você precisa de uma declaração formal.",
    categoria: "Pessoal",
    minutos: 2,
    popular: true,
    icone: "home",
    campos: [
      { key: "nome", pergunta: "Qual o seu nome completo?", placeholder: "Ex: Carlos Eduardo Lima" },
      { key: "rg", pergunta: "Qual o seu RG e CPF?", placeholder: "Ex: RG 12.345.678-9 / CPF 123.456.789-00" },
      { key: "endereco", pergunta: "Qual o seu endereço completo de residência?", placeholder: "Rua, número, bairro, cidade/UF, CEP" },
    ],
    template: {
      titulo: "DECLARAÇÃO DE RESIDÊNCIA",
      corpo: [
        "Eu, {{nome}}, portador(a) do {{rg}}, declaro para os devidos fins de comprovação de residência que resido no endereço: {{endereco}}.",
        "Declaro ainda que as informações acima são verdadeiras, assumindo responsabilidade civil e criminal por eventuais divergências.",
      ],
    },
  },
  {
    slug: "comodato",
    nome: "Contrato de Comodato",
    desc: "Empréstimo gratuito de bens entre conhecidos.",
    quandoUsar:
      "Use quando você vai emprestar um bem (veículo, equipamento, imóvel) gratuitamente para alguém e quer formalizar o empréstimo.",
    categoria: "Comercial",
    minutos: 3,
    popular: true,
    icone: "handshake",
    campos: [
      { key: "comodante", pergunta: "Quem está emprestando o bem (comodante)?", placeholder: "Nome completo" },
      { key: "comodatario", pergunta: "Quem está recebendo o bem (comodatário)?", placeholder: "Nome completo" },
      { key: "bem", pergunta: "Descreva o bem emprestado.", placeholder: "Ex: Notebook Dell Inspiron, série 12345" },
      { key: "prazo", pergunta: "Por quanto tempo o bem fica emprestado?", placeholder: "Ex: 6 meses" },
    ],
    template: {
      titulo: "CONTRATO DE COMODATO",
      corpo: [
        "Pelo presente contrato, {{comodante}}, comodante, entrega em comodato (empréstimo gratuito) a {{comodatario}}, comodatário, o seguinte bem: {{bem}}.",
        "O prazo do comodato é de {{prazo}}, findo o qual o comodatário deverá devolver o bem nas mesmas condições.",
      ],
    },
  },
  {
    slug: "compra-venda",
    nome: "Compra e Venda",
    desc: "Venda de bens com cláusulas claras e seguras.",
    quandoUsar:
      "Use quando você vai vender um bem móvel (veículo, equipamento, animal) e quer um recibo formal de compra e venda.",
    categoria: "Comercial",
    minutos: 5,
    popular: true,
    icone: "receipt",
    campos: [
      { key: "vendedor", pergunta: "Nome completo do vendedor?", placeholder: "Nome completo" },
      { key: "comprador", pergunta: "Nome completo do comprador?", placeholder: "Nome completo" },
      { key: "bem", pergunta: "O que está sendo vendido?", placeholder: "Descreva o bem (marca, modelo, série)" },
      { key: "valor", pergunta: "Qual o valor da venda?", placeholder: "Ex: 25.000,00", tipo: "number" },
      { key: "pagamento", pergunta: "Como será pago?", placeholder: "Ex: À vista, em 3x de R$ 8.333,33" },
    ],
    template: {
      titulo: "CONTRATO DE COMPRA E VENDA",
      corpo: [
        "Pelo presente instrumento, {{vendedor}}, vendedor, vende e entrega a {{comprador}}, comprador, o seguinte bem: {{bem}}.",
        "O valor da venda é de R$ {{valor}}, pago da seguinte forma: {{pagamento}}.",
        "A entrega do bem se dá no ato da assinatura, transferindo-se a propriedade ao comprador.",
      ],
    },
  },
  {
    slug: "uniao-estavel",
    nome: "União Estável",
    desc: "Documente a relação para direitos e deveres.",
    quandoUsar:
      "Use quando você e seu(a) parceiro(a) querem formalizar a união estável para direitos previdenciários, herança, plano de saúde, etc.",
    categoria: "Família",
    minutos: 4,
    popular: true,
    icone: "family",
    campos: [
      { key: "pessoa1", pergunta: "Nome completo da primeira pessoa?", placeholder: "Nome completo" },
      { key: "pessoa2", pergunta: "Nome completo da segunda pessoa?", placeholder: "Nome completo" },
      { key: "inicio", pergunta: "Desde quando vivem juntos?", placeholder: "Ex: 15 de março de 2020" },
      { key: "endereco", pergunta: "Endereço onde moram juntos?", placeholder: "Endereço completo" },
    ],
    template: {
      titulo: "DECLARAÇÃO DE UNIÃO ESTÁVEL",
      corpo: [
        "{{pessoa1}} e {{pessoa2}}, por intermédio desta declaração, atestam que vivem em união estável desde {{inicio}}, de forma contínua, pública e duradoura.",
        "A coabitação ocorre no endereço: {{endereco}}.",
        "Esta declaração é firmada para fins de comprovação perante terceiros e órgãos públicos.",
      ],
    },
  },
  {
    slug: "procuracao-simples",
    nome: "Procuração Simples",
    desc: "Autorize alguém a representar você em atos.",
    quandoUsar:
      "Use quando você precisa autorizar alguém a fazer algo em seu nome (assinar documentos, buscar objetos, representar em um órgão).",
    categoria: "Pessoal",
    minutos: 2,
    icone: "seal",
    campos: [
      { key: "outorgante", pergunta: "Quem está passando a procuração (outorgante)?", placeholder: "Nome completo e CPF" },
      { key: "outorgado", pergunta: "Quem vai receber a procuração (outorgado)?", placeholder: "Nome completo e CPF" },
      { key: "poderes", pergunta: "Quais os poderes concedidos?", placeholder: "Ex: Assinar contrato de aluguel em meu nome" },
    ],
    template: {
      titulo: "PROCURAÇÃO",
      corpo: [
        "Eu, {{outorgante}}, outorgante, nomeio e constituo meu bastante procurador {{outorgado}}, outorgado, a quem confiro os seguintes poderes:",
        "{{poderes}}.",
        "Para assinar documentos e praticar os atos necessários ao exercício do mandato aqui outorgado.",
      ],
    },
  },
];

export function getModelo(slug: string): Modelo | undefined {
  return MODELOS.find((m) => m.slug === slug);
}

export const CATEGORIAS: Categoria[] = ["Locação", "Família", "Comercial", "Pessoal"];
