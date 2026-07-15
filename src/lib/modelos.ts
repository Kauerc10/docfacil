/**
 * Catálogo de modelos de documentos do DocFacil.
 * Single source of truth — usado por Modelos, ModeloDetalhe, Criar, Dashboard.
 *
 * Cada modelo tem: slug, nome, descrição simples, categoria, tempo estimado,
 * etapas que o usuário vai precisar preencher (agrupadas em campo_grupo quando
 * relacionadas — ex.: partes, endereço, valores — para reduzir o número de
 * passos no fluxo Concierge de 20+ para 2-3 por modelo), e a estrutura do
 * documento (template) com placeholders que o fluxo /criar preenche.
 *
 * Tipos de etapa (TipoEtapa):
 *   - "campo"       = uma única pergunta (1 CampoModelo)
 *   - "campo_grupo" = vários campos relacionados em um único card
 *                     (ex.: endereço com CEP → logradouro → bairro → cidade → UF)
 *                     Quando `endereco` está presente, ganha auto-fill ViaCEP +
 *                     normalização de logradouro + composição automática.
 *   - "clausulas"   = lista de cláusulas dinâmicas opcionais (ClausulaDinamica[])
 *                     que o usuário marca/desmarca; cláusulas marcadas injetam
 *                     `{{clausula:id}}` no template.
 *
 * O campo `campos` em `Modelo` é AUTO-DERIVADO de `etapas` via flatMap no
 * final do arquivo (backward-compat com hero.tsx, catalog.tsx, modelo-detalhe-
 * view.tsx que ainda consomem `modelo.campos` diretamente). Não definir
 * `campos` manualmente — definir `etapas` e o forEach popula `campos`.
 *
 * LINGUAGEM ACESSÍVEL: perguntas escritas para pessoa idosa, leiga e qualquer
 * usuário — frases curtas, exemplos concretos, microcopy com dica extra.
 *
 * ENDEREÇO EM CAMPOS SEPARADOS: em vez de um textarea livre para "endereço
 * completo", o usuário preenche CEP, Rua, Número, Complemento (opcional),
 * Bairro, Cidade e UF separadamente. A string final é composta por
 * `composeEndereco` (em `normalizers.ts`) e atribuída à `saidaKey` (ex.:
 * "endereco" ou "imovel") no mapa de respostas — o template consome essa
 * chave como `{{endereco}}` ou `{{imovel}}`.
 *
 * AUTO-CORREÇÃO DE RUA: o campo de logradouro passa por `normalizarLogradouro`
 * no blur — se o usuário digitou "rua arnoldo beck" ou "arnoldo beck", ambos
 * viram "Rua Arnoldo Beck". Isso evita "Rua Rua X" (repetido) ou "arnoldo beck"
 * (sem prefixo) no documento final.
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
// CAMPOS DE ENDEREÇO REUTILIZÁVEIS — 7 campos padronizados
// ============================================================================
// Em vez de cada modelo definir seus próprios campos de endereço, usamos
// este conjunto. A `saidaKey` varia por modelo (ex.: "endereco" para
// declaração, "imovel" para locação) — passada como parâmetro.

function camposEndereco(saidaKey: string, prefixoLabel = "") {
  // prefixoLabel: "do imóvel" / "da sua residência" / "onde moram juntos" —
  // usado para deixar as perguntas naturais em cada contexto.
  const ctx = prefixoLabel ? ` ${prefixoLabel}` : "";
  return {
    campos: [
      { key: `${saidaKey}_cep`, pergunta: `CEP${ctx}:`, placeholder: "Ex: 01234-567", microcopy: "Ao digitar o CEP, preenchemos a rua e o bairro automaticamente." } as CampoModelo,
      { key: `${saidaKey}_rua`, pergunta: `Nome da rua${ctx}:`, placeholder: "Ex: das Flores", microcopy: "Pode digitar com ou sem a palavra \"Rua\" — ajustamos para você." } as CampoModelo,
      { key: `${saidaKey}_numero`, pergunta: `Número${ctx}:`, placeholder: "Ex: 123", microcopy: "Se não tiver número, digite S/N." } as CampoModelo,
      { key: `${saidaKey}_complemento`, pergunta: `Complemento${ctx} (opcional):`, placeholder: "Ex: Apto 45, Bloco B, Casa 2", obrigatorio: false } as CampoModelo,
      { key: `${saidaKey}_bairro`, pergunta: `Bairro${ctx}:`, placeholder: "Ex: Centro" } as CampoModelo,
      { key: `${saidaKey}_cidade`, pergunta: `Cidade${ctx}:`, placeholder: "Ex: São Paulo" } as CampoModelo,
      { key: `${saidaKey}_uf`, pergunta: `Estado (UF)${ctx}:`, placeholder: "Ex: SP", microcopy: "Pode digitar a sigla (SP) ou o nome (São Paulo)." } as CampoModelo,
    ] as CampoModelo[],
    endereco: {
      cepKey: `${saidaKey}_cep`,
      logradouroKey: `${saidaKey}_rua`,
      numeroKey: `${saidaKey}_numero`,
      complementoKey: `${saidaKey}_complemento`,
      bairroKey: `${saidaKey}_bairro`,
      cidadeKey: `${saidaKey}_cidade`,
      ufKey: `${saidaKey}_uf`,
      saidaKey,
    },
  };
}

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
          {
            key: "locador",
            pergunta: "Nome completo de quem está alugando (dono do imóvel):",
            placeholder: "Ex: Maria Aparecida da Silva",
            microcopy: "Escreva o nome completo, igual aparece no RG.",
          },
          {
            key: "locatario",
            pergunta: "Nome completo de quem vai morar (inquilino):",
            placeholder: "Ex: João Pereira Santos",
          },
        ],
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Endereço do imóvel",
        ...camposEndereco("imovel", "do imóvel"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Valores da locação",
        campos: [
          {
            key: "valor",
            pergunta: "Valor do aluguel por mês (R$):",
            placeholder: "Ex: 1.450,00",
            tipo: "number",
            microcopy: "Apenas números. Ex: 1450,00",
          },
          {
            key: "prazo",
            pergunta: "Quantos meses dura o contrato?",
            placeholder: "Ex: 30",
            tipo: "number",
            microcopy: "O mais comum é 30 meses.",
          },
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
        tituloGrupo: "Seus dados pessoais",
        campos: [
          {
            key: "nome",
            pergunta: "Seu nome completo:",
            placeholder: "Ex: Carlos Eduardo Lima",
            microcopy: "Escreva o nome completo, sem abreviar.",
          },
          {
            key: "rg",
            pergunta: "Seu RG e CPF (opcional):",
            placeholder: "Ex: RG 12.345.678-9 / CPF 123.456.789-00",
            obrigatorio: false,
            microcopy: "Se quiser, pode colocar só o RG, ou só o CPF, ou os dois.",
          },
        ],
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Endereço da sua residência",
        ...camposEndereco("endereco", "da sua residência"),
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
        tituloGrupo: "Quem empresta e quem recebe",
        campos: [
          {
            key: "comodante",
            pergunta: "Nome de quem está emprestando (dono do bem):",
            placeholder: "Ex: Antônio Souza",
            microcopy: "Escreva o nome completo.",
          },
          {
            key: "comodatario",
            pergunta: "Nome de quem está recebendo (quem vai usar):",
            placeholder: "Ex: Bruna Ferreira",
          },
        ],
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "O que está sendo emprestado",
        campos: [
          {
            key: "bem",
            pergunta: "Descreva o bem emprestado:",
            placeholder: "Ex: Notebook Dell Inspiron, cor prata, série 12345",
            tipo: "textarea",
            microcopy: "Quanto mais detalhes, melhor. Marca, modelo e série ajudam.",
          },
          {
            key: "prazo",
            pergunta: "Por quanto tempo o bem fica emprestado?",
            placeholder: "Ex: 6 meses",
            microcopy: "Pode escrever em meses, dias ou com data de devolução.",
          },
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
        tituloGrupo: "Quem vende e quem compra",
        campos: [
          {
            key: "vendedor",
            pergunta: "Nome completo de quem está vendendo:",
            placeholder: "Ex: Roberto Alves",
          },
          {
            key: "comprador",
            pergunta: "Nome completo de quem está comprando:",
            placeholder: "Ex: Carla Mendes",
          },
        ],
      },
      {
        tipo: "campo",
        campo: {
          key: "bem",
          pergunta: "O que está sendo vendido?",
          placeholder: "Ex: Honda CG 160, placa ABC-1234, ano 2022",
          tipo: "textarea",
          microcopy: "Descreva com o máximo de detalhes possível (marca, modelo, série, ano).",
        },
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Valor e pagamento",
        campos: [
          {
            key: "valor",
            pergunta: "Valor total da venda (R$):",
            placeholder: "Ex: 25.000,00",
            tipo: "number",
            microcopy: "Apenas números. Ex: 25000,00",
          },
          {
            key: "pagamento",
            pergunta: "Como vai ser pago?",
            placeholder: "Ex: À vista, em 3x de R$ 8.333,33",
            microcopy: "Exemplos: à vista, parcelado em 3x, 50% agora e 50% na entrega.",
          },
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
        tituloGrupo: "Pessoas da união e data de início",
        campos: [
          {
            key: "pessoa1",
            pergunta: "Nome completo da primeira pessoa:",
            placeholder: "Ex: Ana Paula Costa",
          },
          {
            key: "pessoa2",
            pergunta: "Nome completo da segunda pessoa:",
            placeholder: "Ex: Bruno Oliveira",
          },
          {
            key: "inicio",
            pergunta: "Desde quando vivem juntos?",
            placeholder: "Ex: 15 de março de 2020",
            microcopy: "Pode escrever por extenso (15 de março de 2020) ou numérico (15/03/2020).",
          },
        ],
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Endereço onde moram juntos",
        ...camposEndereco("endereco", "onde moram juntos"),
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
        tituloGrupo: "Quem passa e quem recebe a procuração",
        campos: [
          {
            key: "outorgante",
            pergunta: "Seu nome e CPF (quem está passando a procuração):",
            placeholder: "Ex: José Silva, CPF 123.456.789-00",
            microcopy: "Você é quem está autorizando outra pessoa.",
          },
          {
            key: "outorgado",
            pergunta: "Nome e CPF de quem vai receber a procuração:",
            placeholder: "Ex: Maria Souza, CPF 987.654.321-00",
            microcopy: "É a pessoa que vai representar você.",
          },
        ],
      },
      {
        tipo: "campo",
        campo: {
          key: "poderes",
          pergunta: "O que essa pessoa pode fazer por você?",
          placeholder: "Ex: Assinar contrato de aluguel em meu nome",
          tipo: "textarea",
          microcopy: "Descreva com clareza — quanto mais específico, mais seguro.",
        },
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
