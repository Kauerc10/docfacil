/**
 * Catálogo de modelos de documentos do DocFacil.
 * Single source of truth — usado por Modelos, ModeloDetalhe, Criar, Dashboard.
 *
 * Cada modelo tem: slug, nome, descrição simples, categoria, tempo estimado,
 * etapas que o usuário vai precisar preencher (agrupadas em campo_grupo quando
 * relacionadas — ex.: partes, endereço, valores — para reduzir o número de
 * passos no fluxo Concierge de 20+ para 2-4 por modelo), e a estrutura do
 * documento (template) com placeholders que o fluxo /criar preenche.
 *
 * Tipos de etapa (TipoEtapa):
 *   - "campo"       = uma única pergunta (1 CampoModelo)
 *   - "campo_grupo" = vários campos relacionados em um único card
 *                     (ex.: endereço com CEP → logradouro → bairro → cidade → UF)
 *   - "clausulas"   = lista de cláusulas dinâmicas opcionais (ClausulaDinamica[])
 *                     que o usuário marca/desmarca; cláusulas marcadas injetam
 *                     `{{clausula:id}}` no template.
 *
 * O campo `campos` em `Modelo` é AUTO-DERIVADO de `etapas` via flatMap no
 * final do arquivo (backward-compat com hero.tsx, catalog.tsx, modelo-detalhe-
 * view.tsx que ainda consomem `modelo.campos` diretamente). Não definir
 * `campos` manualmente — definir `etapas` e o forEach popula `campos`.
 *
 * Validadores e máscaras determinísticas (não-IA) continuam em
 * `views/criar/types.ts` (mascarar/validar CPF, CNPJ, CEP, estado) e em
 * `normalizers.ts` (normalizar Estado). Aqui apenas re-exportamos os de
 * estado pra conveniência de callers antigos.
 */
import { normalizarEstado, validarEstado } from "./normalizers";
import type {
  CampoModelo,
  Categoria,
  ClausulaDinamica,
  EtapaModelo,
  Modelo,
  TipoEtapa,
} from "./types";

// Re-exporta tipos pra callers que importam de modelos.ts
export type {
  CampoModelo,
  Categoria,
  ClausulaDinamica,
  EtapaModelo,
  Modelo,
  TipoEtapa,
};

// Re-exporta helpers de estado (mantém compat com callers antigos)
export { normalizarEstado, validarEstado };

// ============================================================================
// MODELOS — definição manual (etapas é source of truth; campos é derivado)
// ============================================================================

const MODELS_INPUT: Omit<Modelo, "campos">[] = [
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
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Quem está alugando o imóvel",
        campos: [
          { key: "locador", pergunta: "Nome completo do locador (quem está alugando):", placeholder: "Ex: Maria Aparecida da Silva", microcopy: "Pode copiar direto do RG, sem abreviar." },
          { key: "locatario", pergunta: "Nome completo do locatário (quem vai alugar):", placeholder: "Ex: João Pereira Santos" },
        ],
      },
      {
        tipo: "campo",
        campo: { key: "imovel", pergunta: "Qual o endereço completo do imóvel?", placeholder: "Rua, número, bairro, cidade/UF", microcopy: "Inclua CEP se tiver.", tipo: "textarea" },
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Valores da locação",
        campos: [
          { key: "valor", pergunta: "Valor mensal do aluguel (R$):", placeholder: "Ex: 1.450,00", tipo: "number" },
          { key: "prazo", pergunta: "Prazo da locação (em meses):", placeholder: "Ex: 30", tipo: "number" },
        ],
      },
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
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Suas informações",
        campos: [
          { key: "nome", pergunta: "Nome completo:", placeholder: "Ex: Carlos Eduardo Lima" },
          { key: "rg", pergunta: "RG e CPF (opcional):", placeholder: "Ex: RG 12.345.678-9 / CPF 123.456.789-00", obrigatorio: false },
        ],
      },
      {
        tipo: "campo",
        campo: { key: "endereco", pergunta: "Qual o seu endereço completo de residência?", placeholder: "Rua, número, bairro, cidade/UF, CEP", tipo: "textarea" },
      },
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
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Partes",
        campos: [
          { key: "comodante", pergunta: "Nome de quem está emprestando (comodante):", placeholder: "Nome completo" },
          { key: "comodatario", pergunta: "Nome de quem está recebendo (comodatário):", placeholder: "Nome completo" },
        ],
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Bem e prazo",
        campos: [
          { key: "bem", pergunta: "Descreva o bem emprestado:", placeholder: "Ex: Notebook Dell Inspiron, série 12345", tipo: "textarea" },
          { key: "prazo", pergunta: "Por quanto tempo o bem fica emprestado?", placeholder: "Ex: 6 meses" },
        ],
      },
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
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Partes",
        campos: [
          { key: "vendedor", pergunta: "Nome completo do vendedor:", placeholder: "Nome completo" },
          { key: "comprador", pergunta: "Nome completo do comprador:", placeholder: "Nome completo" },
        ],
      },
      {
        tipo: "campo",
        campo: { key: "bem", pergunta: "O que está sendo vendido?", placeholder: "Descreva o bem (marca, modelo, série)", tipo: "textarea" },
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Valores",
        campos: [
          { key: "valor", pergunta: "Valor da venda (R$):", placeholder: "Ex: 25.000,00", tipo: "number" },
          { key: "pagamento", pergunta: "Como será pago?", placeholder: "Ex: À vista, em 3x de R$ 8.333,33" },
        ],
      },
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
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Pessoas",
        campos: [
          { key: "pessoa1", pergunta: "Nome completo da primeira pessoa:", placeholder: "Nome completo" },
          { key: "pessoa2", pergunta: "Nome completo da segunda pessoa:", placeholder: "Nome completo" },
        ],
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Datas e endereço",
        campos: [
          { key: "inicio", pergunta: "Desde quando vivem juntos?", placeholder: "Ex: 15 de março de 2020" },
          { key: "endereco", pergunta: "Endereço onde moram juntos?", placeholder: "Endereço completo", tipo: "textarea" },
        ],
      },
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
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Partes",
        campos: [
          { key: "outorgante", pergunta: "Quem está passando a procuração (outorgante):", placeholder: "Nome completo e CPF" },
          { key: "outorgado", pergunta: "Quem vai receber a procuração (outorgado):", placeholder: "Nome completo e CPF" },
        ],
      },
      {
        tipo: "campo",
        campo: { key: "poderes", pergunta: "Quais os poderes concedidos?", placeholder: "Ex: Assinar contrato de aluguel em meu nome", tipo: "textarea" },
      },
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

// ============================================================================
// Flatten etapas → campos (backward-compat com hero/catalog/modelo-detalhe)
// ============================================================================
// Importante: este `.map` roda uma vez no load do módulo e popula `campos`
// em cada modelo a partir das `etapas`. campo_grupo expande para múltiplos
// campos; campo vira 1 campo; clausulas não contribuem para `campos`
// (elas são injetadas no template via `{{clausula:id}}`, não via {{key}}).
export const MODELOS: Modelo[] = MODELS_INPUT.map((m) => ({
  ...m,
  campos: m.etapas
    ? m.etapas.flatMap((e) =>
        e.tipo === "campo_grupo"
          ? e.campos
          : e.tipo === "campo"
          ? [e.campo]
          : []
      )
    : [],
}));

export function getModelo(slug: string): Modelo | undefined {
  return MODELOS.find((m) => m.slug === slug);
}

export const CATEGORIAS: Categoria[] = ["Locação", "Família", "Comercial", "Pessoal"];
