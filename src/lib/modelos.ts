/**
 * Catálogo de modelos de documentos do DocFacil.
 * Single source of truth — usado por Modelos, ModeloDetalhe, Criar, Dashboard.
 *
 * ## Arquitetura modular (LEIA antes de adicionar modelos)
 *
 * Cada modelo declara `etapas` (source of truth) e `template`. O motor em
 * `lib/document-engine/` cuida de tudo: preencher `{{key}}`, injetar
 * `{{clausula:id}}`, classificar linhas (heading/paragraph/signature/...),
 * quebrar/paginar em A4 e compor endereços a partir dos campos separados.
 *
 * Para adicionar um novo modelo:
 *   1. Escolha um slug único (ex.: "contrato-prestacao-servico")
 *   2. Defina `etapas` usando os helpers `camposParte()`, `camposEndereco()`
 *      e/ou `{ tipo: "clausulas", clausulas: [...] }`
 *   3. Defina `template` com `{{key}}` placeholders (use as `saidaKey`s das
 *      composições de endereço, ex.: `{{locador_endereco}}`, `{{imovel}}`)
 *   4. Para cláusulas opcionais, use `{{clausula:id}}` no template — vira o
 *      corpo da cláusula quando selecionada, ou "" caso contrário
 *
 * ## Helpers disponíveis
 *
 * - `camposParte(prefix, label)` → retorna `{ campos, endereco }` para uma
 *   "parte" (pessoa) com nome, CPF, RG (opcional), estado civil e endereço
 *   completo. A string composta vai para `{{prefix_endereco}}` no template.
 *   Ex.: `camposParte("locador", "do locador")` gera campos `locador_nome`,
 *   `locador_cpf`, `locador_rg`, `locador_estado_civil`, `locador_endereco`
 *   (composto), etc.
 *
 * - `camposEndereco(saidaKey, label)` → retorna `{ campos, endereco }` para
 *   um endereço avulso (sem dados de pessoa). Útil para o endereço do imóvel
 *   em contrato de locação. Ex.: `camposEndereco("imovel", "do imóvel")`.
 *
 * ## Campos opcionais
 *
 * Campos com `obrigatorio: false` viram "" no template quando vazios (em vez
 * de "______________________"). Os campos individuais de endereço (CEP, rua,
 * número, etc.) são automaticamente tratados como opcionais pelo motor — só
 * a `saidaKey` (string composta) aparece no template.
 */
import { normalizarEstado, validarEstado } from "./normalizers";
import type {
  CampoModelo,
  Categoria,
  ClausulaDinamica,
  EtapaModelo,
  Modelo,
  TipoEtapa,
  EnderecoConfig,
} from "./types";

// Re-exporta tipos pra callers que importam de modelos.ts
export type {
  CampoModelo,
  Categoria,
  ClausulaDinamica,
  EtapaModelo,
  Modelo,
  TipoEtapa,
  EnderecoConfig,
};

// Re-exporta helpers de estado (mantém compat com callers antigos)
export { normalizarEstado, validarEstado };

// ============================================================================
// HELPERS REUTILIZÁVEIS — campos padronizados para partes e endereços
// ============================================================================

const ESTADOS_CIVIS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União estável",
  "Separado(a) judicialmente",
];

interface CamposResult {
  campos: CampoModelo[];
  endereco: EnderecoConfig;
}

/**
 * Helper para criar uma "parte" (pessoa) com dados pessoais + endereço.
 *
 * Gera 11 campos:
 *   - {prefix}_nome (text)
 *   - {prefix}_cpf (text, máscara CPF)
 *   - {prefix}_rg (text, opcional)
 *   - {prefix}_estado_civil (select com ESTADOS_CIVIS)
 *   - {prefix}_cep (text, máscara CEP, auto-fill ViaCEP)
 *   - {prefix}_rua (text, auto-normalização de logradouro)
 *   - {prefix}_numero (text)
 *   - {prefix}_complemento (text, opcional)
 *   - {prefix}_bairro (text)
 *   - {prefix}_cidade (text)
 *   - {prefix}_uf (text, máscara estado)
 *
 * A string composta do endereço vai para `{{prefix_endereco}}` no template
 * (formato: "Rua das Flores, 123 - Centro - São Paulo/SP, CEP 01234-567").
 *
 * @param prefix Prefixo das chaves (ex.: "locador", "locatario", "vendedor")
 * @param label Sufixo amigável das perguntas (ex.: "do locador", "do locatário")
 */
function camposParte(prefix: string, label: string): CamposResult {
  const p = prefix;
  const l = label;
  return {
    campos: [
      {
        key: `${p}_nome`,
        pergunta: `Nome completo ${l}:`,
        placeholder: "Ex: Maria Aparecida da Silva",
        microcopy: "Escreva o nome completo, igual aparece no RG.",
      },
      {
        key: `${p}_cpf`,
        pergunta: `CPF ${l}:`,
        placeholder: "Ex: 123.456.789-00",
        microcopy: "Apenas números ou com pontos e traço — formatamos para você.",
      },
      {
        key: `${p}_rg`,
        pergunta: `RG ${l} (opcional):`,
        placeholder: "Ex: 12.345.678-9",
        obrigatorio: false,
        microcopy: "Se não quiser informar, pode deixar em branco.",
      },
      {
        key: `${p}_estado_civil`,
        pergunta: `Estado civil ${l}:`,
        tipo: "select",
        opcoes: ESTADOS_CIVIS,
        microcopy: "Toque para escolher uma opção.",
      },
      // Endereço
      {
        key: `${p}_cep`,
        pergunta: `CEP ${l}:`,
        placeholder: "Ex: 01234-567",
        microcopy: "Ao digitar o CEP, preenchemos a rua e o bairro automaticamente.",
      },
      {
        key: `${p}_rua`,
        pergunta: `Nome da rua ${l}:`,
        placeholder: "Ex: das Flores",
        microcopy: "Pode digitar com ou sem a palavra \"Rua\" — ajustamos para você.",
      },
      {
        key: `${p}_numero`,
        pergunta: `Número ${l}:`,
        placeholder: "Ex: 123",
        microcopy: "Se não tiver número, digite S/N.",
      },
      {
        key: `${p}_complemento`,
        pergunta: `Complemento ${l} (opcional):`,
        placeholder: "Ex: Apto 45, Bloco B, Casa 2",
        obrigatorio: false,
      },
      {
        key: `${p}_bairro`,
        pergunta: `Bairro ${l}:`,
        placeholder: "Ex: Centro",
      },
      {
        key: `${p}_cidade`,
        pergunta: `Cidade ${l}:`,
        placeholder: "Ex: São Paulo",
      },
      {
        key: `${p}_uf`,
        pergunta: `Estado (UF) ${l}:`,
        placeholder: "Ex: SP",
        microcopy: "Pode digitar a sigla (SP) ou o nome (São Paulo).",
      },
    ],
    endereco: {
      cepKey: `${p}_cep`,
      logradouroKey: `${p}_rua`,
      numeroKey: `${p}_numero`,
      complementoKey: `${p}_complemento`,
      bairroKey: `${p}_bairro`,
      cidadeKey: `${p}_cidade`,
      ufKey: `${p}_uf`,
      saidaKey: `${p}_endereco`,
    },
  };
}

/**
 * Helper para criar campos de endereço avulso (sem dados de pessoa).
 * Útil para o endereço do imóvel em contrato de locação.
 *
 * Gera 7 campos (CEP, rua, número, complemento opcional, bairro, cidade, UF).
 * A string composta vai para `{{saidaKey}}` no template.
 *
 * @param saidaKey Chave virtual que recebe a string composta (ex.: "imovel")
 * @param label Sufixo amigável (ex.: "do imóvel", "da sua residência")
 */
function camposEndereco(saidaKey: string, label = ""): CamposResult {
  const l = label ? ` ${label}` : "";
  return {
    campos: [
      {
        key: `${saidaKey}_cep`,
        pergunta: `CEP${l}:`,
        placeholder: "Ex: 01234-567",
        microcopy: "Ao digitar o CEP, preenchemos a rua e o bairro automaticamente.",
      },
      {
        key: `${saidaKey}_rua`,
        pergunta: `Nome da rua${l}:`,
        placeholder: "Ex: das Flores",
        microcopy: "Pode digitar com ou sem a palavra \"Rua\" — ajustamos para você.",
      },
      {
        key: `${saidaKey}_numero`,
        pergunta: `Número${l}:`,
        placeholder: "Ex: 123",
        microcopy: "Se não tiver número, digite S/N.",
      },
      {
        key: `${saidaKey}_complemento`,
        pergunta: `Complemento${l} (opcional):`,
        placeholder: "Ex: Apto 45, Bloco B, Casa 2",
        obrigatorio: false,
      },
      {
        key: `${saidaKey}_bairro`,
        pergunta: `Bairro${l}:`,
        placeholder: "Ex: Centro",
      },
      {
        key: `${saidaKey}_cidade`,
        pergunta: `Cidade${l}:`,
        placeholder: "Ex: São Paulo",
      },
      {
        key: `${saidaKey}_uf`,
        pergunta: `Estado (UF)${l}:`,
        placeholder: "Ex: SP",
        microcopy: "Pode digitar a sigla (SP) ou o nome (São Paulo).",
      },
    ],
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
  // ==========================================================================
  // 1. CONTRATO DE LOCAÇÃO
  // ==========================================================================
  {
    slug: "contrato-locacao",
    nome: "Contrato de Locação",
    desc: "Para alugar imóvel com segurança entre as partes.",
    quandoUsar:
      "Use quando você vai alugar um imóvel (residencial ou comercial) e precisa de um contrato formal entre locador e locatário.",
    categoria: "Locação",
    minutos: 5,
    popular: true,
    icone: "key",
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Locador (dono do imóvel)",
        ...camposParte("locador", "do(a) locador(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Locatário (inquilino)",
        ...camposParte("locatario", "do(a) locatário(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Endereço do imóvel alugado",
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
      {
        tipo: "clausulas",
        titulo: "Cláusulas adicionais (opcional)",
        clausulas: [
          {
            id: "fiador",
            titulo: "Fiador",
            descricao: "Inclui cláusula exigindo fiador para a locação.",
            corpo: "O LOCATÁRIO apresentará fiador, {{fiador_nome}}, portador(a) do CPF {{fiador_cpf}}, que responde solidariamente por todas as obrigações deste contrato.",
            camposExtras: [
              {
                key: "fiador_nome",
                pergunta: "Nome completo do fiador:",
                placeholder: "Ex: José Santos Oliveira",
              },
              {
                key: "fiador_cpf",
                pergunta: "CPF do fiador:",
                placeholder: "Ex: 123.456.789-00",
              },
            ],
          },
          {
            id: "multa",
            titulo: "Multa por rescisão antecipada",
            descricao: "Aplica multa proporcional aos meses restantes em caso de rescisão.",
            corpo: "Em caso de rescisão antecipada do contrato, o LOCATÁRIO pagará multa de {{multa_valor}}, proporcional aos meses restantes, conforme Lei do Inquilinato (Lei 8.245/91).",
            camposExtras: [
              {
                key: "multa_valor",
                pergunta: "Valor da multa (ex: 3 meses de aluguel):",
                placeholder: "Ex: 3 meses de aluguel",
                microcopy: "Descreva o valor ou a proporção.",
              },
            ],
          },
          {
            id: "reajuste",
            titulo: "Reajuste anual",
            descricao: "Reajuste do aluguel por índice (IPCA/IGP-M) a cada 12 meses.",
            corpo: "O valor do aluguel será reajustado anualmente pelo índice {{reajuste_indice}}, na data-base de aniversário do contrato, conforme legislação vigente.",
            camposExtras: [
              {
                key: "reajuste_indice",
                pergunta: "Índice de reajuste:",
                placeholder: "IPCA, IGP-M, etc.",
                microcopy: "O IPCA é o índice mais usado hoje em dia.",
              },
            ],
          },
          {
            id: "caucao",
            titulo: "Caução (depósito de garantia)",
            descricao: "Exige caução de até 3 meses de aluguel como garantia.",
            corpo: "O LOCATÁRIO entrega ao LOCADOR, como caução, o valor de R$ {{caucao_valor}}, equivalente a {{caucao_meses}} mês(es) de aluguel, que será devolvido ao final do contrato caso não haja débitos pendentes.",
            camposExtras: [
              {
                key: "caucao_valor",
                pergunta: "Valor da caução (R$):",
                placeholder: "Ex: 1.450,00",
                tipo: "number",
              },
              {
                key: "caucao_meses",
                pergunta: "Equivalente a quantos meses de aluguel?",
                placeholder: "Ex: 1",
                tipo: "number",
                microcopy: "A lei permite no máximo 3 meses.",
              },
            ],
          },
          {
            id: "animais",
            titulo: "Permitir animais de estimação",
            descricao: "Autoriza o LOCATÁRIO a manter animais domésticos no imóvel.",
            corpo: "Fica autorizada a permanência de animais de estimação no imóvel, desde que não causem danos à estrutura ou incomodem vizinhos.",
          },
        ],
      },
    ],
    template: {
      titulo: "CONTRATO DE LOCAÇÃO",
      corpo: [
        "Pelo presente instrumento particular, {{locador_nome}}, {{locador_estado_civil}}, portador(a) do CPF {{locador_cpf}}{{locador_rg_separador}}, doravante denominado(a) LOCADOR(A), loca para {{locatario_nome}}, {{locatario_estado_civil}}, portador(a) do CPF {{locatario_cpf}}{{locatario_rg_separador}}, doravante LOCATÁRIO(A), o imóvel situado em {{imovel}}.",
        "A locação tem prazo de {{prazo}} meses, com início na data da assinatura, e valor mensal de R$ {{valor}}.",
        "O LOCATÁRIO obriga-se a pagar o aluguel até o dia 5 de cada mês, sob pena de multa de 10%.",
        "O LOCADOR reside em {{locador_endereco}}.",
        "O LOCATÁRIO reside em {{locatario_endereco}}.",
        "{{clausula:fiador}}",
        "{{clausula:multa}}",
        "{{clausula:reajuste}}",
        "{{clausula:caucao}}",
        "{{clausula:animais}}",
        "[ASSINATURA] ___________________________  {{locador_nome}} — LOCADOR(A)",
        "[ASSINATURA] ___________________________  {{locatario_nome}} — LOCATÁRIO(A)",
      ],
    },
  },

  // ==========================================================================
  // 2. DECLARAÇÃO DE RESIDÊNCIA
  // ==========================================================================
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
            key: "cpf",
            pergunta: "Seu CPF:",
            placeholder: "Ex: 123.456.789-00",
          },
          {
            key: "rg",
            pergunta: "Seu RG (opcional):",
            placeholder: "Ex: 12.345.678-9",
            obrigatorio: false,
            microcopy: "Se quiser, pode deixar em branco.",
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
        "Eu, {{nome}}, portador(a) do CPF {{cpf}}{{rg_separador}}, declaro para os devidos fins de comprovação de residência que resido no endereço: {{endereco}}.",
        "Declaro ainda que as informações acima são verdadeiras, assumindo responsabilidade civil e criminal por eventuais divergências.",
      ],
    },
  },

  // ==========================================================================
  // 3. CONTRATO DE COMODATO
  // ==========================================================================
  {
    slug: "comodato",
    nome: "Contrato de Comodato",
    desc: "Empréstimo gratuito de bens entre conhecidos.",
    quandoUsar:
      "Use quando você vai emprestar um bem (veículo, equipamento, imóvel) gratuitamente para alguém e quer formalizar o empréstimo.",
    categoria: "Comercial",
    minutos: 4,
    popular: true,
    icone: "handshake",
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados de quem empresta (comodante)",
        ...camposParte("comodante", "do(a) comodante"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados de quem recebe (comodatário)",
        ...camposParte("comodatario", "do(a) comodatário(a)"),
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
      {
        tipo: "clausulas",
        titulo: "Cláusulas adicionais (opcional)",
        clausulas: [
          {
            id: "responsabilidade",
            titulo: "Responsabilidade por danos",
            descricao: "Comodatário responde por perdas e danos ao bem.",
            corpo: "O COMODATÁRIO responde objetivamente por qualquer dano, perda ou deterioração do bem emprestado, incluindo furto ou roubo, ficando obrigado a reparar ou repor o bem no estado em que o recebeu.",
          },
          {
            id: "uso",
            titulo: "Uso exclusivo pessoal",
            descricao: "Veda o empréstimo/cessão a terceiros.",
            corpo: "O uso do bem é pessoal e intransferível, vedado ao COMODATÁRIO emprestar, alugar, ceder ou transferir o bem a terceiros, sob pena de rescisão imediata do presente contrato.",
          },
          {
            id: "devolucao",
            titulo: "Devolução antecipada",
            descricao: "Comodante pode pedir o bem de volta a qualquer momento.",
            corpo: "O COMODANTE poderá solicitar a devolução do bem a qualquer momento, independentemente do prazo estipulado, comprometendo-se o COMODATÁRIO a devolvê-lo no prazo de {{devolucao_prazo}} dias a contar do pedido.",
            camposExtras: [
              {
                key: "devolucao_prazo",
                pergunta: "Prazo para devolução após pedido (em dias):",
                placeholder: "Ex: 7",
                tipo: "number",
              },
            ],
          },
        ],
      },
    ],
    template: {
      titulo: "CONTRATO DE COMODATO",
      corpo: [
        "Pelo presente contrato, {{comodante_nome}}, {{comodante_estado_civil}}, portador(a) do CPF {{comodante_cpf}}{{comodante_rg_separador}}, comodante, entrega em comodato (empréstimo gratuito) a {{comodatario_nome}}, {{comodatario_estado_civil}}, portador(a) do CPF {{comodatario_cpf}}{{comodatario_rg_separador}}, comodatário, o seguinte bem: {{bem}}.",
        "O prazo do comodato é de {{prazo}}, findo o qual o comodatário deverá devolver o bem nas mesmas condições.",
        "O comodante reside em {{comodante_endereco}}.",
        "O comodatário reside em {{comodatario_endereco}}.",
        "{{clausula:responsabilidade}}",
        "{{clausula:uso}}",
        "{{clausula:devolucao}}",
        "[ASSINATURA] ___________________________  {{comodante_nome}} — COMODANTE",
        "[ASSINATURA] ___________________________  {{comodatario_nome}} — COMODATÁRIO",
      ],
    },
  },

  // ==========================================================================
  // 4. COMPRA E VENDA
  // ==========================================================================
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
        tituloGrupo: "Dados do Vendedor",
        ...camposParte("vendedor", "do(a) vendedor(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Comprador",
        ...camposParte("comprador", "do(a) comprador(a)"),
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
      {
        tipo: "clausulas",
        titulo: "Cláusulas adicionais (opcional)",
        clausulas: [
          {
            id: "garantia",
            titulo: "Garantia do bem",
            descricao: "Vendedor garante o bem contra defeitos por um prazo.",
            corpo: "O VENDEDOR garante o bem contra defeitos de fabricação por prazo de {{garantia_prazo}} dias a contar da entrega, comprometendo-se a reparar ou substituir o bem em caso de vício oculto.",
            camposExtras: [
              {
                key: "garantia_prazo",
                pergunta: "Prazo de garantia (em dias):",
                placeholder: "Ex: 90",
                tipo: "number",
              },
            ],
          },
          {
            id: "entrega",
            titulo: "Condições de entrega",
            descricao: "Define quando e onde o bem será entregue.",
            corpo: "A entrega do bem ocorrerá em {{entrega_local}}, no prazo de {{entrega_prazo}} dias a contar da assinatura, transferindo-se a posse ao comprador no ato da entrega.",
            camposExtras: [
              {
                key: "entrega_local",
                pergunta: "Local de entrega:",
                placeholder: "Ex: residência do comprador",
              },
              {
                key: "entrega_prazo",
                pergunta: "Prazo de entrega (em dias):",
                placeholder: "Ex: 7",
                tipo: "number",
              },
            ],
          },
          {
            id: "eviccao",
            titulo: "Evicção (direito a reembolso)",
            descricao: "Se o bem for reivindicado por terceiro, vendedor reembolsa.",
            corpo: "O VENDEDOR responde pela evicção: se o bem for reivindicado por terceiro com título anterior, o VENDEDOR reembolsará o COMPRADOR pelo valor pago, conforme arts. 457 e seguintes do Código Civil.",
          },
        ],
      },
    ],
    template: {
      titulo: "CONTRATO DE COMPRA E VENDA",
      corpo: [
        "Pelo presente instrumento, {{vendedor_nome}}, {{vendedor_estado_civil}}, portador(a) do CPF {{vendedor_cpf}}{{vendedor_rg_separador}}, vendedor, vende e entrega a {{comprador_nome}}, {{comprador_estado_civil}}, portador(a) do CPF {{comprador_cpf}}{{comprador_rg_separador}}, comprador, o seguinte bem: {{bem}}.",
        "O valor da venda é de R$ {{valor}}, pago da seguinte forma: {{pagamento}}.",
        "O vendedor reside em {{vendedor_endereco}}.",
        "O comprador reside em {{comprador_endereco}}.",
        "{{clausula:garantia}}",
        "{{clausula:entrega}}",
        "{{clausula:eviccao}}",
        "[ASSINATURA] ___________________________  {{vendedor_nome}} — VENDEDOR",
        "[ASSINATURA] ___________________________  {{comprador_nome}} — COMPRADOR",
      ],
    },
  },

  // ==========================================================================
  // 5. UNIÃO ESTÁVEL
  // ==========================================================================
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
        tituloGrupo: "Dados da primeira pessoa",
        ...camposParte("pessoa1", "da primeira pessoa"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados da segunda pessoa",
        ...camposParte("pessoa2", "da segunda pessoa"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Datas e endereço onde moram juntos",
        campos: [
          {
            key: "inicio",
            pergunta: "Desde quando vivem juntos?",
            placeholder: "Ex: 15 de março de 2020",
            microcopy: "Pode escrever por extenso (15 de março de 2020) ou numérico (15/03/2020).",
          },
          {
            key: "regime",
            pergunta: "Regime de bens desejado:",
            tipo: "select",
            opcoes: [
              "Comunhão parcial de bens (padrão)",
              "Comunhão universal de bens",
              "Separação total de bens",
              "Participação final nos aquestos",
            ],
            microcopy: "Na dúvida, escolha \"Comunhão parcial\" — é o padrão da lei.",
          },
        ],
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Endereço onde moram juntos",
        ...camposEndereco("endereco", "onde moram juntos"),
      },
      {
        tipo: "clausulas",
        titulo: "Cláusulas adicionais (opcional)",
        clausulas: [
          {
            id: "alimentos",
            titulo: "Obrigação alimentar recíproca",
            descricao: "Inclui dever de mútua assistência alimentar.",
            corpo: "Os conviventes assumem o dever de mútua assistência alimentar, nos termos do art. 1.724 do Código Civil, comprometendo-se a contribuir proporcionalmente para o sustento da família.",
          },
          {
            id: "filhos",
            titulo: "Filhos em comum",
            descricao: "Declara existência de filhos do relacionamento.",
            corpo: "Do relacionamento dos conviventes há {{filhos_quantidade}} filho(s) menor(es): {{filhos_nomes}}, aos quais ambos assumem o dever de guarda, sustento e educação.",
            camposExtras: [
              {
                key: "filhos_quantidade",
                pergunta: "Quantidade de filhos em comum:",
                placeholder: "Ex: 2",
                tipo: "number",
              },
              {
                key: "filhos_nomes",
                pergunta: "Nome(s) do(s) filho(s) (menores):",
                placeholder: "Ex: Ana Lima e Pedro Lima",
                tipo: "textarea",
              },
            ],
          },
          {
            id: "dissolucao",
            titulo: "Condições de dissolução",
            descricao: "Define o que acontece caso a união termine.",
            corpo: "Em caso de dissolução da união estável, os bens adquiridos em conjunto serão partilhados conforme o regime escolhido, e eventuais alimentos serão fixados por acordo ou judicialmente.",
          },
        ],
      },
    ],
    template: {
      titulo: "DECLARAÇÃO DE UNIÃO ESTÁVEL",
      corpo: [
        "{{pessoa1_nome}}, {{pessoa1_estado_civil}}, portador(a) do CPF {{pessoa1_cpf}}{{pessoa1_rg_separador}}, e {{pessoa2_nome}}, {{pessoa2_estado_civil}}, portador(a) do CPF {{pessoa2_cpf}}{{pessoa2_rg_separador}}, por intermédio desta declaração, atestam que vivem em união estável desde {{inicio}}, de forma contínua, pública e duradoura, sob o regime de {{regime}}.",
        "A coabitação ocorre no endereço: {{endereco}}.",
        "{{clausula:alimentos}}",
        "{{clausula:filhos}}",
        "{{clausula:dissolucao}}",
        "Esta declaração é firmada para fins de comprovação perante terceiros e órgãos públicos.",
        "[ASSINATURA] ___________________________  {{pessoa1_nome}}",
        "[ASSINATURA] ___________________________  {{pessoa2_nome}}",
      ],
    },
  },

  // ==========================================================================
  // 6. PROCURAÇÃO SIMPLES
  // ==========================================================================
  {
    slug: "procuracao-simples",
    nome: "Procuração Simples",
    desc: "Autorize alguém a representar você em atos.",
    quandoUsar:
      "Use quando você precisa autorizar alguém a fazer algo em seu nome (assinar documentos, buscar objetos, representar em um órgão).",
    categoria: "Pessoal",
    minutos: 3,
    icone: "seal",
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Seus dados (outorgante — quem passa a procuração)",
        ...camposParte("outorgante", "do(a) outorgante"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados de quem vai representar você (outorgado)",
        ...camposParte("outorgado", "do(a) outorgado(a)"),
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
      {
        tipo: "clausulas",
        titulo: "Cláusulas adicionais (opcional)",
        clausulas: [
          {
            id: "prazo",
            titulo: "Prazo de validade",
            descricao: "Define quando a procuração expira.",
            corpo: "Esta procuração é válida por {{prazo_duracao}} a contar da assinatura, extinguindo-se automaticamente ao termo deste prazo.",
            camposExtras: [
              {
                key: "prazo_duracao",
                pergunta: "Prazo de validade (ex: 90 dias, 6 meses, 1 ano):",
                placeholder: "Ex: 90 dias",
              },
            ],
          },
          {
            id: "subestabelecimento",
            titulo: "Permitir subestabelecimento",
            descricao: "Autoriza o outorgado a passar a procuração a terceiros.",
            corpo: "Fica o outorgado autorizado a subestabelecer esta procuração a terceiros, total ou parcialmente, conservando ou não o exercício dos poderes outorgados.",
          },
          {
            id: "renuncia",
            titulo: "Renúncia expressa",
            descricao: "Outorgante pode revogar a procuração a qualquer momento.",
            corpo: "O outorgante poderá revogar esta procuração a qualquer momento, mediante comunicação por escrito ao outorgado, independentemente de aviso prévio.",
          },
        ],
      },
    ],
    template: {
      titulo: "PROCURAÇÃO",
      corpo: [
        "Eu, {{outorgante_nome}}, {{outorgante_estado_civil}}, portador(a) do CPF {{outorgante_cpf}}{{outorgante_rg_separador}}, outorgante, nomeio e constituo meu bastante procurador {{outorgado_nome}}, {{outorgado_estado_civil}}, portador(a) do CPF {{outorgado_cpf}}{{outorgado_rg_separador}}, outorgado, a quem confiro os seguintes poderes:",
        "{{poderes}}.",
        "Para assinar documentos e praticar os atos necessários ao exercício do mandato aqui outorgado.",
        "O outorgante reside em {{outorgante_endereco}}.",
        "O outorgado reside em {{outorgado_endereco}}.",
        "{{clausula:prazo}}",
        "{{clausula:subestabelecimento}}",
        "{{clausula:renuncia}}",
        "[ASSINATURA] ___________________________  {{outorgante_nome}} — OUTORGANTE",
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
