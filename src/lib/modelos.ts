/**
 * Catálogo de modelos de documentos do DocFacil.
 * Single source of truth — usado por Modelos, ModeloDetalhe, Criar, Dashboard.
 *
 * ## Modelos baseados em PDFs de referência profissionais
 *
 * Os templates foram extraídos de contratos e declarações reais, com cláusulas
 * completas (objeto, prazo, aluguel, encargos, garantia, rescisão, foro, etc.)
 * e formatação profissional (CLÁUSULA PRIMEIRA – DO OBJETO, etc.).
 *
 * ## Helpers disponíveis
 *
 * - `camposParteCompleta(prefix, label)` → nome, nacionalidade, estado civil,
 *   profissão, RG (opcional), CPF — SEM endereço. Para contratos onde a parte
 *   não precisa de endereço próprio (ex.: locador em contrato de locação).
 *
 * - `camposParteComEndereco(prefix, label)` → nome, nacionalidade, estado civil,
 *   profissão, RG (opcional), CPF + endereço completo (7 campos). String
 *   composta do endereço vai para `{{prefix_endereco}}`.
 *
 * - `camposEndereco(saidaKey, label)` → 7 campos de endereço avulso (CEP, rua,
 *   número, complemento, bairro, cidade, UF). String composta → `{{saidaKey}}`.
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

const NACIONALIDADES = [
  "Brasileiro(a)",
  "Brasileiro(a) naturalizado(a)",
  "Português(a)",
  "Argentino(a)",
  "Outra",
];

interface CamposResult {
  campos: CampoModelo[];
  endereco?: EnderecoConfig;
}

/**
 * Helper para criar uma "parte" (pessoa) COMPLETA mas SEM endereço.
 * Usado em contratos onde a parte não precisa de endereço próprio (ex.: locador
 * em contrato de locação — só o imóvel e o locatário têm endereço).
 *
 * Gera 6 campos: nome, nacionalidade (select), estado civil (select),
 * profissão, RG (opcional), CPF.
 */
function camposParteCompleta(prefix: string, label: string): CamposResult {
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
        key: `${p}_nacionalidade`,
        pergunta: `Nacionalidade ${l}:`,
        tipo: "select",
        opcoes: NACIONALIDADES,
      },
      {
        key: `${p}_estado_civil`,
        pergunta: `Estado civil ${l}:`,
        tipo: "select",
        opcoes: ESTADOS_CIVIS,
      },
      {
        key: `${p}_profissao`,
        pergunta: `Profissão ${l}:`,
        placeholder: "Ex: Comerciante",
      },
      {
        key: `${p}_rg`,
        pergunta: `RG ${l} (opcional):`,
        placeholder: "Ex: 12.345.678-9",
        obrigatorio: false,
        microcopy: "Se não quiser informar, pode deixar em branco.",
      },
      {
        key: `${p}_cpf`,
        pergunta: `CPF ${l}:`,
        placeholder: "Ex: 123.456.789-00",
      },
    ],
  };
}

/**
 * Helper para criar uma "parte" (pessoa) COMPLETA COM endereço.
 * Usado em declarações, contratos de compra e venda, etc.
 *
 * Gera 13 campos: nome, nacionalidade, estado civil, profissão, RG, CPF +
 * 7 campos de endereço. String composta → `{{prefix_endereco}}`.
 */
function camposParteComEndereco(prefix: string, label: string): CamposResult {
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
        key: `${p}_nacionalidade`,
        pergunta: `Nacionalidade ${l}:`,
        tipo: "select",
        opcoes: NACIONALIDADES,
      },
      {
        key: `${p}_estado_civil`,
        pergunta: `Estado civil ${l}:`,
        tipo: "select",
        opcoes: ESTADOS_CIVIS,
      },
      {
        key: `${p}_profissao`,
        pergunta: `Profissão ${l}:`,
        placeholder: "Ex: Comerciante",
      },
      {
        key: `${p}_rg`,
        pergunta: `RG ${l} (opcional):`,
        placeholder: "Ex: 12.345.678-9",
        obrigatorio: false,
        microcopy: "Se não quiser informar, pode deixar em branco.",
      },
      {
        key: `${p}_cpf`,
        pergunta: `CPF ${l}:`,
        placeholder: "Ex: 123.456.789-00",
      },
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
// MODELOS — baseados em PDFs de referência profissionais
// ============================================================================

const MODELS_INPUT: Omit<Modelo, "campos">[] = [
  // ==========================================================================
  // 1. CONTRATO DE LOCAÇÃO RESIDENCIAL
  // Baseado em: Contrato_Locacao_Residencial.pdf
  // Locador: sem endereço (só dados pessoais)
  // Locatário: sem endereço próprio (usa endereço do imóvel no template)
  // ==========================================================================
  {
    slug: "contrato-locacao",
    nome: "Contrato de Locação Residencial",
    desc: "Contrato completo de aluguel residencial com 11 cláusulas (Lei 8.245/91).",
    quandoUsar:
      "Use quando você vai alugar um imóvel residencial e precisa de um contrato formal e completo entre locador e locatário, com todas as cláusulas da Lei do Inquilinato.",
    categoria: "Locação",
    minutos: 6,
    popular: true,
    icone: "key",
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Locador (dono do imóvel)",
        ...camposParteCompleta("locador", "do(a) locador(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Locatário (inquilino)",
        ...camposParteCompleta("locatario", "do(a) locatário(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Endereço do imóvel alugado",
        ...camposEndereco("imovel", "do imóvel"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Valores e prazo da locação",
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
          {
            key: "dia_vencimento",
            pergunta: "Dia de vencimento do aluguel:",
            placeholder: "Ex: 5",
            tipo: "number",
            microcopy: "Dia do mês em que o aluguel deve ser pago.",
          },
          {
            key: "forma_pagamento",
            pergunta: "Como será pago o aluguel?",
            placeholder: "Ex: PIX, depósito bancário, boleto",
            microcopy: "Ex: transferência via PIX para a chave 11999999999",
          },
        ],
      },
      {
        tipo: "clausulas",
        titulo: "Garantia locatícia (opcional — escolha uma modalidade)",
        clausulas: [
          {
            id: "caucao",
            titulo: "Caução em dinheiro",
            descricao: "Locatário deposita até 3 meses de aluguel como garantia.",
            corpo: "Como garantia do fiel cumprimento das obrigações assumidas neste contrato, as partes optam pela modalidade CAUÇÃO EM DINHEIRO, nos termos do art. 37 da Lei nº 8.245/1991. O LOCATÁRIO deposita neste ato, a título de caução, a importância de R$ {{caucao_valor}}, equivalente a {{caucao_meses}} mês(es) de aluguel, que será depositada em caderneta de poupança e restituída ao término da locação, devidamente corrigida, após a entrega das chaves e vistoria de saída.",
            camposExtras: [
              {
                key: "caucao_valor",
                pergunta: "Valor da caução (R$):",
                placeholder: "Ex: 4.350,00",
                tipo: "number",
              },
              {
                key: "caucao_meses",
                pergunta: "Equivalente a quantos meses de aluguel?",
                placeholder: "Ex: 3",
                tipo: "number",
                microcopy: "A lei permite no máximo 3 meses.",
              },
            ],
          },
          {
            id: "fiador",
            titulo: "Fiador",
            descricao: "Terceiro se compromete como fiador solidário do locatário.",
            corpo: "Como garantia do fiel cumprimento das obrigações assumidas neste contrato, as partes optam pela modalidade FIANÇA, nos termos do art. 37 da Lei nº 8.245/1991. Assina também este contrato, como FIADOR(A) e principal pagador(a), solidariamente responsável com o LOCATÁRIO, o(a) Sr.(a) {{fiador_nome}}, portador(a) do CPF nº {{fiador_cpf}}, cujas obrigações subsistirão até a efetiva devolução das chaves, mesmo após o término do prazo contratual.",
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
            id: "seguro_fianca",
            titulo: "Seguro-fiança locatícia",
            descricao: "Apólice de seguro-fiança contratada com seguradora.",
            corpo: "Como garantia do fiel cumprimento das obrigações assumidas neste contrato, as partes optam pela modalidade SEGURO-FIANÇA LOCATÍCIA, nos termos do art. 37 da Lei nº 8.245/1991, mediante apólice nº {{seguro_numero}}, emitida pela seguradora {{seguro_seguradora}}.",
            camposExtras: [
              {
                key: "seguro_numero",
                pergunta: "Número da apólice:",
                placeholder: "Ex: 2024XXXXXX",
              },
              {
                key: "seguro_seguradora",
                pergunta: "Nome da seguradora:",
                placeholder: "Ex: Porto Seguro Aluguel",
              },
            ],
          },
        ],
      },
    ],
    template: {
      titulo: "CONTRATO DE LOCAÇÃO RESIDENCIAL",
      corpo: [
        "(Instrumento particular firmado nos termos da Lei nº 8.245/1991)",
        "",
        "Pelo presente instrumento particular de locação residencial, de um lado:",
        "LOCADOR(A): {{locador_nome}}, {{locador_nacionalidade}}, {{locador_estado_civil}}, {{locador_profissao}}, portador(a) do RG nº {{locador_rg_separador}} e inscrito(a) no CPF sob o nº {{locador_cpf}}, doravante denominado(a) simplesmente LOCADOR;",
        "e, de outro lado:",
        "LOCATÁRIO(A): {{locatario_nome}}, {{locatario_nacionalidade}}, {{locatario_estado_civil}}, {{locatario_profissao}}, portador(a) do RG nº {{locatario_rg_separador}} e inscrito(a) no CPF sob o nº {{locatario_cpf}}, residente e domiciliado(a) na {{imovel}}, doravante denominado(a) simplesmente LOCATÁRIO;",
        "têm entre si justo e contratado o presente Contrato de Locação Residencial, mediante as cláusulas e condições a seguir:",
        "",
        "## CLÁUSULA PRIMEIRA – DO OBJETO",
        "O LOCADOR dá em locação ao LOCATÁRIO o imóvel residencial situado na {{imovel}}, doravante denominado simplesmente IMÓVEL, destinado exclusivamente ao uso residencial do LOCATÁRIO e de seus familiares diretos, sendo vedada qualquer outra destinação sem prévia e expressa anuência do LOCADOR.",
        "O imóvel é entregue ao LOCATÁRIO em perfeitas condições de habitabilidade, conservação, limpeza e funcionamento de suas instalações elétricas, hidráulicas e demais equipamentos, conforme discriminado no Termo de Vistoria e Entrega, que passa a integrar o presente contrato para todos os fins.",
        "",
        "## CLÁUSULA SEGUNDA – DO PRAZO",
        "O prazo de locação é de {{prazo}} meses, com início na data da assinatura, findo o qual o contrato se extinguirá de pleno direito, independentemente de notificação ou aviso, nos termos do art. 46 da Lei nº 8.245/1991.",
        "Findo o prazo estipulado, se o LOCATÁRIO permanecer no imóvel por mais de 30 (trinta) dias sem oposição do LOCADOR, a locação prorrogar-se-á por prazo indeterminado, sujeita às mesmas condições pactuadas neste instrumento, salvo denúncia escrita nos termos da lei.",
        "",
        "## CLÁUSULA TERCEIRA – DO ALUGUEL E FORMA DE PAGAMENTO",
        "O valor mensal do aluguel é de R$ {{valor}}, a ser pago até o dia {{dia_vencimento}} de cada mês, mediante {{forma_pagamento}} na conta de titularidade do LOCADOR, ou outro meio expressamente indicado por escrito.",
        "O não pagamento do aluguel e demais encargos até a data do vencimento sujeitará o LOCATÁRIO a: a) multa moratória de 10% (dez por cento) sobre o valor em atraso; b) juros de mora de 1% (um por cento) ao mês, calculados pro rata die; c) correção monetária pelo índice IPCA acumulado no período do atraso.",
        "O valor do aluguel será reajustado anualmente, a cada 12 (doze) meses contados da data de início da locação, pela variação acumulada do índice IPCA/IBGE no período, ou por outro índice que legalmente venha a substituí-lo.",
        "",
        "## CLÁUSULA QUARTA – DOS ENCARGOS E TRIBUTOS",
        "Correrão por conta exclusiva do LOCATÁRIO, durante toda a vigência do contrato: a) as despesas de consumo de água, esgoto, energia elétrica, gás e internet/TV a cabo, se houver; b) as taxas condominiais ordinárias, incluindo fundo de reserva quando exigido pela convenção condominial; c) o Imposto Predial e Territorial Urbano (IPTU) e taxas municipais incidentes sobre o imóvel, salvo estipulação em contrário.",
        "As despesas condominiais extraordinárias, assim consideradas nos termos do art. 22, §1º, da Lei nº 8.245/1991, correrão por conta do LOCADOR.",
        "",
        "## CLÁUSULA QUINTA – DA GARANTIA LOCATÍCIA",
        "{{clausula:caucao}}",
        "{{clausula:fiador}}",
        "{{clausula:seguro_fianca}}",
        "A garantia escolhida vigorará durante toda a locação, inclusive em eventuais prorrogações, até a efetiva entrega das chaves e quitação de todas as obrigações contratuais, sendo vedada a exoneração do garantidor antes desse termo, nos termos do art. 39 da Lei nº 8.245/1991.",
        "",
        "## CLÁUSULA SEXTA – DAS BENFEITORIAS",
        "O LOCATÁRIO não poderá realizar modificações, reformas ou benfeitorias no imóvel sem prévia autorização por escrito do LOCADOR.",
        "As benfeitorias necessárias, ainda que não autorizadas, bem como as úteis, quando autorizadas, serão indenizadas e permitem o exercício do direito de retenção, nos termos do art. 35 da Lei nº 8.245/1991. As benfeitorias voluptuárias não serão indenizáveis, podendo o LOCATÁRIO levantá-las ao término da locação, desde que sua retirada não danifique a estrutura do imóvel.",
        "",
        "## CLÁUSULA SÉTIMA – DA RESCISÃO E DA MULTA",
        "A infração de qualquer cláusula deste contrato, bem como a inadimplência de aluguéis e encargos por período superior a 30 (trinta) dias, autoriza a parte inocente a promover a rescisão contratual e a competente ação de despejo, sem prejuízo das perdas e danos cabíveis.",
        "Na hipótese de denúncia antecipada do contrato pelo LOCATÁRIO antes do término do prazo estipulado na Cláusula Segunda, incidirá multa compensatória equivalente a 3 (três) aluguéis vigentes, calculada proporcionalmente ao período restante do contrato, nos termos do art. 4º da Lei nº 8.245/1991.",
        "",
        "## CLÁUSULA OITAVA – DA DEVOLUÇÃO DO IMÓVEL",
        "Ao término da locação, por qualquer motivo, o LOCATÁRIO deverá restituir o imóvel nas mesmas condições em que o recebeu, ressalvados os desgastes decorrentes do uso normal, mediante nova vistoria e assinatura de Termo de Entrega de Chaves, sob pena de responder por perdas e danos, além do valor do aluguel e encargos até a efetiva desocupação.",
        "",
        "## CLÁUSULA NONA – DA VISTORIA",
        "As partes declaram ter vistoriado o imóvel previamente à assinatura deste contrato, encontrando-o em condições adequadas para a finalidade a que se destina, conforme Termo de Vistoria, com registro fotográfico anexo, que passa a integrar este instrumento.",
        "",
        "## CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS",
        "Fica expressamente vedada a cessão, sublocação ou empréstimo, total ou parcial, do imóvel objeto deste contrato, sem prévia e expressa autorização por escrito do LOCADOR.",
        "Este contrato obriga as partes, seus herdeiros e sucessores a qualquer título, e não se extingue com a eventual alienação do imóvel, nos termos do art. 8º da Lei nº 8.245/1991, desde que averbado o presente instrumento na matrícula do imóvel.",
        "Toda comunicação entre as partes deverá ser feita por escrito, através de carta com aviso de recebimento, e-mail ou aplicativo de mensagens com confirmação de leitura.",
        "",
        "## CLÁUSULA DÉCIMA PRIMEIRA – DO FORO",
        "Fica eleito o foro da Comarca de {{imovel_cidade}}/{{imovel_uf}} para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
        "",
        "E, por estarem assim justos e contratados, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo.",
        "{{imovel_cidade}}/{{imovel_uf}}, [data de assinatura].",
        "",
        "[ASSINATURA] _______________________________________________",
        "LOCADOR(A) — {{locador_nome}} — CPF nº {{locador_cpf}}",
        "",
        "[ASSINATURA] _______________________________________________",
        "LOCATÁRIO(A) — {{locatario_nome}} — CPF nº {{locatario_cpf}}",
        "",
        "TESTEMUNHAS:",
        "1) _________________________________________________ Nome: _________________________ CPF: _______________",
        "2) _________________________________________________ Nome: _________________________ CPF: _______________",
      ],
    },
  },

  // ==========================================================================
  // 2. CONTRATO DE LOCAÇÃO COMERCIAL (NOVO)
  // Baseado em: Contrato_Locacao_Comercial.pdf
  // ==========================================================================
  {
    slug: "contrato-locacao-comercial",
    nome: "Contrato de Locação Comercial",
    desc: "Contrato de aluguel não residencial (Lei 8.245/91) para comércio.",
    quandoUsar:
      "Use quando você vai alugar um imóvel comercial (sala, loja, galpão) para fins de exploração de atividade econômica.",
    categoria: "Locação",
    minutos: 6,
    popular: false,
    icone: "key",
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Locador",
        ...camposParteCompleta("locador", "do(a) locador(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Locatário",
        ...camposParteCompleta("locatario", "do(a) locatário(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Endereço do imóvel comercial",
        ...camposEndereco("imovel", "do imóvel"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Valores, prazo e atividade",
        campos: [
          {
            key: "valor",
            pergunta: "Valor do aluguel por mês (R$):",
            placeholder: "Ex: 3.500,00",
            tipo: "number",
          },
          {
            key: "prazo",
            pergunta: "Quantos meses dura o contrato?",
            placeholder: "Ex: 36",
            tipo: "number",
            microcopy: "Contratos comerciais costumam ter 36 ou 60 meses.",
          },
          {
            key: "dia_vencimento",
            pergunta: "Dia de vencimento do aluguel:",
            placeholder: "Ex: 5",
            tipo: "number",
          },
          {
            key: "atividade",
            pergunta: "Qual a atividade comercial a ser explorada?",
            placeholder: "Ex: Restaurantes e lanchonetes",
            microcopy: "Descreva o ramo de atividade que será exercido no imóvel.",
          },
        ],
      },
      {
        tipo: "clausulas",
        titulo: "Garantia locatícia (opcional)",
        clausulas: [
          {
            id: "caucao",
            titulo: "Caução em dinheiro",
            descricao: "Locatário deposita até 3 meses de aluguel como garantia.",
            corpo: "Como garantia das obrigações assumidas, as partes optam pela modalidade CAUÇÃO EM DINHEIRO, nos termos do art. 37 da Lei nº 8.245/1991. O LOCATÁRIO deposita neste ato, a título de caução, a importância de R$ {{caucao_valor}}, equivalente a {{caucao_meses}} mês(es) de aluguel.",
            camposExtras: [
              { key: "caucao_valor", pergunta: "Valor da caução (R$):", placeholder: "Ex: 10.500,00", tipo: "number" },
              { key: "caucao_meses", pergunta: "Equivalente a quantos meses?", placeholder: "Ex: 3", tipo: "number" },
            ],
          },
          {
            id: "fiador",
            titulo: "Fiador",
            descricao: "Terceiro se compromete como fiador solidário.",
            corpo: "Como garantia das obrigações assumidas, as partes optam pela modalidade FIANÇA, nos termos do art. 37 da Lei nº 8.245/1991. Assina também este contrato, como FIADOR(A) e principal pagador(a), solidariamente responsável com o LOCATÁRIO, o(a) Sr.(a) {{fiador_nome}}, portador(a) do CPF nº {{fiador_cpf}}.",
            camposExtras: [
              { key: "fiador_nome", pergunta: "Nome completo do fiador:", placeholder: "Ex: José Santos Oliveira" },
              { key: "fiador_cpf", pergunta: "CPF do fiador:", placeholder: "Ex: 123.456.789-00" },
            ],
          },
        ],
      },
    ],
    template: {
      titulo: "CONTRATO DE LOCAÇÃO COMERCIAL",
      corpo: [
        "(Instrumento particular firmado nos termos da Lei nº 8.245/1991)",
        "",
        "Pelo presente instrumento particular de locação não residencial, de um lado:",
        "LOCADOR(A): {{locador_nome}}, {{locador_nacionalidade}}, {{locador_estado_civil}}, {{locador_profissao}}, portador(a) do RG nº {{locador_rg_separador}} e inscrito(a) no CPF sob o nº {{locador_cpf}}, doravante denominado(a) simplesmente LOCADOR;",
        "e, de outro lado:",
        "LOCATÁRIO(A): {{locatario_nome}}, {{locatario_nacionalidade}}, {{locatario_estado_civil}}, {{locatario_profissao}}, portador(a) do RG nº {{locatario_rg_separador}} e inscrito(a) no CPF sob o nº {{locatario_cpf}}, com sede/domicílio na {{imovel}}, doravante denominado(a) simplesmente LOCATÁRIO;",
        "têm entre si justo e contratado o presente Contrato de Locação Comercial, mediante as cláusulas e condições a seguir:",
        "",
        "## CLÁUSULA PRIMEIRA – DO OBJETO E DESTINAÇÃO",
        "O LOCADOR dá em locação ao LOCATÁRIO o imóvel não residencial situado na {{imovel}}, doravante denominado IMÓVEL, destinado exclusivamente à instalação e exploração da atividade de {{atividade}}, sendo vedada qualquer alteração de destinação sem prévia anuência escrita do LOCADOR.",
        "O imóvel é entregue nas condições descritas no Termo de Vistoria, que integra este contrato, cabendo ao LOCATÁRIO obter, às suas expensas, todas as licenças, alvarás e autorizações necessárias ao exercício de sua atividade, incluindo alvará de funcionamento, licença sanitária e/ou ambiental, quando exigíveis.",
        "",
        "## CLÁUSULA SEGUNDA – DO PRAZO",
        "O prazo de locação é de {{prazo}} meses, com início na data da assinatura, extinguindo-se de pleno direito ao seu término, independentemente de notificação, nos termos do art. 56 da Lei nº 8.245/1991.",
        "Caso o LOCATÁRIO preencha os requisitos do art. 51 da Lei nº 8.245/1991, poderá exercer o direito à renovação compulsória do contrato mediante ação renovatória, proposta no prazo legal.",
        "",
        "## CLÁUSULA TERCEIRA – DO ALUGUEL E REAJUSTE",
        "O valor mensal do aluguel é de R$ {{valor}}, a ser pago até o dia {{dia_vencimento}} de cada mês, mediante transferência bancária/PIX em favor do LOCADOR, conforme dados bancários informados por escrito.",
        "O atraso no pagamento sujeitará o LOCATÁRIO a multa moratória de 10% (dez por cento), juros de mora de 1% (um por cento) ao mês e correção monetária pelo índice IPCA, sem prejuízo da rescisão contratual e ação de despejo cabíveis.",
        "O aluguel será reajustado anualmente pela variação acumulada do índice IPCA/IBGE, ou outro que legalmente venha a substituí-lo.",
        "",
        "## CLÁUSULA QUARTA – DOS ENCARGOS E TRIBUTOS",
        "Correrão por conta exclusiva do LOCATÁRIO, durante toda a vigência da locação: a) despesas de consumo (água, esgoto, energia elétrica, gás, internet e telefonia); b) despesas condominiais ordinárias e extraordinárias, quando o imóvel integrar condomínio comercial; c) o IPTU, taxas municipais, e eventual Imposto sobre Serviços (ISS) incidente sobre a própria atividade explorada; d) prêmios de seguro contra incêndio e demais riscos exigidos por lei ou pela administração do imóvel/condomínio.",
        "",
        "## CLÁUSULA QUINTA – DA GARANTIA LOCATÍCIA",
        "{{clausula:caucao}}",
        "{{clausula:fiador}}",
        "A garantia vigorará durante toda a locação, inclusive em eventual prorrogação, até a efetiva desocupação e quitação integral das obrigações contratuais.",
        "",
        "## CLÁUSULA SEXTA – DAS BENFEITORIAS E ADAPTAÇÕES",
        "Fica permitido ao LOCATÁRIO realizar as adaptações necessárias ao exercício de sua atividade, mediante prévia comunicação e anuência escrita do LOCADOR, correndo as respectivas despesas por conta exclusiva do LOCATÁRIO, sem direito a indenização ou retenção, exceto quanto às benfeitorias necessárias, nos termos do art. 35 da Lei nº 8.245/1991.",
        "",
        "## CLÁUSULA SÉTIMA – DA SUBLOCAÇÃO E CESSÃO",
        "É vedada a sublocação, cessão ou transferência do contrato, total ou parcial, incluindo cessão de fundo de comércio, sem prévia e expressa autorização escrita do LOCADOR, sob pena de rescisão contratual e despejo, nos termos do art. 13 da Lei nº 8.245/1991.",
        "",
        "## CLÁUSULA OITAVA – DA RESCISÃO E MULTA",
        "O descumprimento de qualquer cláusula contratual, bem como a inadimplência de aluguéis e encargos por período superior a 30 (trinta) dias, autoriza a rescisão do contrato e a propositura de ação de despejo, sem prejuízo de perdas e danos.",
        "A denúncia antecipada do contrato pelo LOCATÁRIO, antes do término do prazo estipulado, sujeitará este ao pagamento de multa compensatória equivalente a 3 (três) aluguéis vigentes, calculada proporcionalmente ao período restante, nos termos do art. 4º da Lei nº 8.245/1991.",
        "",
        "## CLÁUSULA NONA – DA DEVOLUÇÃO DO IMÓVEL",
        "Ao término da locação, o LOCATÁRIO deverá desocupar e restituir o imóvel livre de pessoas, bens e ocupantes, nas condições em que o recebeu, ressalvado o desgaste natural pelo uso regular, retirando eventuais instalações e adaptações que tiver promovido, e reparando os danos que a retirada causar, mediante Termo de Entrega de Chaves.",
        "",
        "## CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS",
        "Este contrato obriga as partes, seus herdeiros e sucessores a qualquer título, não se extinguindo com a eventual alienação do imóvel, desde que averbado na respectiva matrícula, nos termos do art. 8º da Lei nº 8.245/1991.",
        "Toda comunicação entre as partes será feita por escrito, mediante carta com aviso de recebimento, e-mail ou aplicativo de mensagens com confirmação de leitura.",
        "",
        "## CLÁUSULA DÉCIMA PRIMEIRA – DO FORO",
        "Fica eleito o foro da Comarca de {{imovel_cidade}}/{{imovel_uf}} para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
        "",
        "E, por estarem assim justos e contratados, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo.",
        "{{imovel_cidade}}/{{imovel_uf}}, [data de assinatura].",
        "",
        "[ASSINATURA] _______________________________________________",
        "LOCADOR(A) — {{locador_nome}} — CPF nº {{locador_cpf}}",
        "",
        "[ASSINATURA] _______________________________________________",
        "LOCATÁRIO(A) — {{locatario_nome}} — CPF nº {{locatario_cpf}}",
        "",
        "TESTEMUNHAS:",
        "1) _________________________________________________ Nome: _________________________ CPF: _______________",
        "2) _________________________________________________ Nome: _________________________ CPF: _______________",
      ],
    },
  },

  // ==========================================================================
  // 3. AUTODECLARAÇÃO DE RESIDÊNCIA
  // Baseado em: AutoDeclaracao_de_Residencia.pdf
  // O declarante declara o SEU PRÓPRIO endereço (auto-declaração)
  // ==========================================================================
  {
    slug: "declaracao-residencia",
    nome: "Autodeclaração de Residência",
    desc: "Declaração da própria residência sob penas da lei (art. 299 CP).",
    quandoUsar:
      "Use quando VOCÊ MESMO precisa declarar onde mora, para bancos, escolas, órgãos públicos, processos seletivos, etc. Esta é uma autodeclaração firmada sob as penas da lei.",
    categoria: "Pessoal",
    minutos: 3,
    popular: true,
    icone: "home",
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Seus dados pessoais (declarante)",
        ...camposParteComEndereco("declarante", "do(a) declarante"),
      },
      {
        tipo: "campo",
        campo: {
          key: "finalidade",
          pergunta: "Para que fim você está fazendo esta declaração?",
          placeholder: "Ex: Comprovação de endereço perante instituição financeira",
          tipo: "textarea",
          microcopy: "Descreva a finalidade da declaração (banco, escola, órgão público, etc.).",
        },
      },
    ],
    template: {
      titulo: "DECLARAÇÃO DE RESIDÊNCIA",
      corpo: [
        "(Declaração firmada sob as penas da lei — art. 299 do Código Penal)",
        "",
        "Eu, {{declarante_nome}}, {{declarante_nacionalidade}}, {{declarante_estado_civil}}, {{declarante_profissao}}, portador(a) da Cédula de Identidade (RG) nº {{declarante_rg_separador}} e inscrito(a) no Cadastro de Pessoas Físicas (CPF/MF) sob o nº {{declarante_cpf}}, DECLARO, sob as penas da lei, para os devidos fins de direito e onde se fizer necessário, que resido atualmente no seguinte endereço:",
        "",
        "Endereço: {{declarante_endereco}}.",
        "",
        "Declaro, ainda, que as informações prestadas nesta declaração são verdadeiras e de minha inteira responsabilidade, estando ciente de que a declaração falsa constitui crime previsto no art. 299 do Código Penal Brasileiro (falsidade ideológica), sujeitando-me às penalidades cabíveis nas esferas cível, penal e administrativa.",
        "",
        "Esta declaração é firmada para fins de {{finalidade}}, não se admitindo uso diverso do aqui declarado sem a devida atualização.",
        "",
        "{{declarante_cidade}}/{{declarante_uf}}, [data de assinatura].",
        "",
        "[ASSINATURA] _______________________________________________",
        "{{declarante_nome}}",
        "CPF nº {{declarante_cpf}}",
        "",
        "Observação: Para maior segurança jurídica perante bancos, órgãos públicos ou processos seletivos, recomenda-se o reconhecimento de firma em Cartório de Notas, bem como a juntada de um comprovante de residência em nome do declarante.",
      ],
    },
  },

  // ==========================================================================
  // 4. DECLARAÇÃO DE RESIDÊNCIA POR TERCEIRO (NOVO)
  // Baseado em: declaracao-residencia-antonio-marcos-dos-santos.pdf
  // O declarante declara que OUTRA PESSOA reside em seu imóvel
  // ==========================================================================
  {
    slug: "declaracao-residencia-terceiro",
    nome: "Declaração de Residência por Terceiro",
    desc: "Você declara que outra pessoa reside no seu imóvel (com art. 299 CP).",
    quandoUsar:
      "Use quando VOCÊ é o proprietário/locatário do imóvel e precisa declarar que OUTRA PESSOA reside no seu endereço (ex.: filho, parente, amigo que mora com você e precisa de comprovante).",
    categoria: "Pessoal",
    minutos: 3,
    popular: false,
    icone: "home",
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Seus dados (declarante — dono do imóvel)",
        ...camposParteComEndereco("declarante", "do(a) declarante"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados da pessoa que reside no seu imóvel",
        campos: [
          {
            key: "residente_nome",
            pergunta: "Nome completo de quem reside no seu imóvel:",
            placeholder: "Ex: Antônio Marcos dos Santos",
          },
          {
            key: "residente_documento",
            pergunta: "Documento de identificação do residente:",
            placeholder: "Ex: CNH nº 04892541434 — DETRAN/SC",
            microcopy: "Pode ser RG, CPF, CNH ou outro documento oficial com foto.",
          },
          {
            key: "residente_cpf",
            pergunta: "CPF do residente:",
            placeholder: "Ex: 070.581.739-31",
          },
        ],
      },
    ],
    template: {
      titulo: "DECLARAÇÃO DE RESIDÊNCIA",
      corpo: [
        "Eu, {{declarante_nome}}, {{declarante_nacionalidade}}, portadora da cédula de identidade nº {{declarante_rg_separador}} e inscrita no CPF nº {{declarante_cpf}}, declaro para devidos fins que {{residente_nome}}, {{residente_documento}} e inscrito no CPF nº {{residente_cpf}}, reside no imóvel situado na {{declarante_endereco}}.",
        "",
        "Declaro ainda ter ciência de que a falsidade da presente declaração pode implicar na sanção penal prevista no art. 299 do Código Penal, transcrita abaixo:",
        "",
        "\"Art. 299 - Omitir, em documento público ou particular, declaração que dele devia constar, ou nele inserir ou fazer inserir declaração falsa ou diversa da que devia ser escrita, com o fim de prejudicar direito, criar obrigação ou alterar a verdade sobre fato juridicamente relevante:",
        "Pena - reclusão, de um a cinco anos, e multa, se o documento é público, e reclusão de um a três anos, e multa, se o documento é particular.\"",
        "",
        "{{declarante_cidade}}/{{declarante_uf}}, [data de assinatura].",
        "",
        "[ASSINATURA] _______________________________________________",
        "Declarante",
      ],
    },
  },

  // ==========================================================================
  // 5. CONTRATO DE COMPRA E VENDA DE IMÓVEL (NOVO)
  // Baseado em: Contrato_Compra_e_Venda_Imovel.pdf
  // ==========================================================================
  {
    slug: "contrato-compra-venda-imovel",
    nome: "Compra e Venda de Imóvel",
    desc: "Contrato completo de compra e venda de imóvel urbano.",
    quandoUsar:
      "Use quando você vai comprar ou vender um imóvel (casa, apartamento, terreno) e precisa de um contrato formal de compra e venda com todas as cláusulas legais.",
    categoria: "Comercial",
    minutos: 6,
    popular: true,
    icone: "receipt",
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Vendedor",
        ...camposParteComEndereco("vendedor", "do(a) vendedor(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Comprador",
        ...camposParteComEndereco("comprador", "do(a) comprador(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Endereço do imóvel",
        ...camposEndereco("imovel", "do imóvel"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Valores e pagamento",
        campos: [
          {
            key: "valor",
            pergunta: "Valor total da venda (R$):",
            placeholder: "Ex: 350.000,00",
            tipo: "number",
          },
          {
            key: "sinal",
            pergunta: "Valor do sinal pago nesta data (R$):",
            placeholder: "Ex: 35.000,00",
            tipo: "number",
            microcopy: "O sinal serve como arras confirmatórias (arts. 417-420 CC).",
          },
          {
            key: "saldo_pagamento",
            pergunta: "Como será pago o saldo restante?",
            placeholder: "Ex: À vista na assinatura da escritura / Financiamento bancário / 36x de R$ 8.750,00",
            tipo: "textarea",
            microcopy: "Descreva como o saldo será pago (à vista, parcelado, financiamento).",
          },
        ],
      },
    ],
    template: {
      titulo: "INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE IMÓVEL",
      corpo: [
        "(Compromisso/Contrato particular — sujeito a escrituração pública quando exigida em lei)",
        "",
        "Pelo presente instrumento particular, de um lado:",
        "VENDEDOR(A): {{vendedor_nome}}, {{vendedor_nacionalidade}}, {{vendedor_estado_civil}}, {{vendedor_profissao}}, portador(a) do RG nº {{vendedor_rg_separador}} e inscrito(a) no CPF sob o nº {{vendedor_cpf}}, residente e domiciliado(a) na {{vendedor_endereco}}, doravante denominado(a) simplesmente VENDEDOR;",
        "e, de outro lado:",
        "COMPRADOR(A): {{comprador_nome}}, {{comprador_nacionalidade}}, {{comprador_estado_civil}}, {{comprador_profissao}}, portador(a) do RG nº {{comprador_rg_separador}} e inscrito(a) no CPF sob o nº {{comprador_cpf}}, residente e domiciliado(a) na {{comprador_endereco}}, doravante denominado(a) simplesmente COMPRADOR;",
        "têm entre si justo e contratado o presente Instrumento Particular de Compra e Venda de Imóvel, mediante as cláusulas e condições a seguir:",
        "",
        "## CLÁUSULA PRIMEIRA – DO OBJETO",
        "O VENDEDOR é legítimo e único proprietário do imóvel situado na {{imovel}}, doravante denominado simplesmente IMÓVEL.",
        "Pelo presente instrumento, o VENDEDOR vende, e o COMPRADOR compra, o IMÓVEL acima descrito, livre e desembaraçado de quaisquer ônus, dívidas, hipotecas, penhoras ou gravames de qualquer natureza.",
        "",
        "## CLÁUSULA SEGUNDA – DO PREÇO E DA FORMA DE PAGAMENTO",
        "O preço certo e ajustado para a presente compra e venda é de R$ {{valor}}, a ser pago pelo COMPRADOR ao VENDEDOR da seguinte forma:",
        "a) Sinal e princípio de pagamento (arras confirmatórias) no valor de R$ {{sinal}}, pago nesta data, servindo o presente instrumento como recibo para todos os fins de direito;",
        "b) O saldo remanescente será pago da seguinte forma: {{saldo_pagamento}}.",
        "O atraso no pagamento de qualquer parcela sujeitará o COMPRADOR a multa moratória de 2% (dois por cento) sobre o valor em atraso, juros de mora de 1% (um por cento) ao mês e correção monetária pelo índice IPCA, sem prejuízo das demais sanções contratuais.",
        "",
        "## CLÁUSULA TERCEIRA – DAS ARRAS E DA RESCISÃO",
        "As arras mencionadas na Cláusula Segunda, alínea \"a\", têm caráter confirmatório do negócio, nos termos dos arts. 417 a 420 do Código Civil. Caso o COMPRADOR desista injustificadamente do negócio, perderá o valor das arras em favor do VENDEDOR. Caso a desistência parta do VENDEDOR, este deverá restituir ao COMPRADOR o valor das arras em dobro, devidamente atualizado.",
        "",
        "## CLÁUSULA QUARTA – DA POSSE E DA TRADIÇÃO",
        "A posse do IMÓVEL será transmitida ao COMPRADOR na data de quitação integral do preço / assinatura da escritura pública, momento a partir do qual correrão por conta do COMPRADOR todas as despesas de manutenção, condomínio, tributos e demais encargos incidentes sobre o imóvel.",
        "Até a efetiva transmissão da posse, o VENDEDOR responde pela guarda e conservação do imóvel, respondendo por eventuais danos causados por sua culpa ou dolo.",
        "",
        "## CLÁUSULA QUINTA – DA SITUAÇÃO JURÍDICA DO IMÓVEL",
        "O VENDEDOR declara, sob as penas da lei, que o IMÓVEL encontra-se livre e desembaraçado de quaisquer ônus reais, judiciais ou extrajudiciais, bem como que inexistem débitos de IPTU, condomínio, taxas ou contribuições pendentes até a presente data.",
        "Caso sobrevenha qualquer ônus ou pendência não declarada, o VENDEDOR responderá pela evicção, nos termos dos arts. 447 a 457 do Código Civil.",
        "",
        "## CLÁUSULA SEXTA – DA ESCRITURA PÚBLICA E DO REGISTRO",
        "Quitado integralmente o preço, as partes se obrigam a outorgar e receber a competente Escritura Pública de Compra e Venda, no Tabelionato de Notas de livre escolha do COMPRADOR, no prazo de 30 (trinta) dias, ficando desde já ajustado que a presente compra e venda somente se aperfeiçoa e produz efeitos erga omnes (perante terceiros) após o registro do respectivo título na matrícula do imóvel, no Cartório de Registro de Imóveis competente, nos termos do art. 1.245 do Código Civil.",
        "",
        "## CLÁUSULA SÉTIMA – DOS TRIBUTOS E DESPESAS DA TRANSAÇÃO",
        "Correrão por conta do COMPRADOR as despesas relativas ao Imposto de Transmissão de Bens Imóveis (ITBI), emolumentos cartorários de escritura e registro, e certidões necessárias à lavratura do ato.",
        "Correrão por conta do VENDEDOR eventuais débitos tributários e condominiais anteriores à data da transmissão da posse, bem como o Imposto de Renda incidente sobre eventual ganho de capital.",
        "",
        "## CLÁUSULA OITAVA – DA MULTA",
        "O descumprimento de qualquer cláusula deste contrato por qualquer das partes sujeitará o infrator ao pagamento de multa de 10% (dez por cento) sobre o valor total da transação, sem prejuízo da execução específica da obrigação e da indenização por perdas e danos comprovados.",
        "",
        "## CLÁUSULA NONA – DAS DISPOSIÇÕES GERAIS",
        "Este contrato obriga as partes, seus herdeiros e sucessores a qualquer título, sendo vedada a cessão de direitos a terceiros sem prévia anuência por escrito da outra parte.",
        "As partes declaram estar cientes de que a mera assinatura deste instrumento particular não dispensa, quando exigível, a lavratura de escritura pública e o registro no Cartório de Registro de Imóveis competente para a efetiva transferência da propriedade.",
        "",
        "## CLÁUSULA DÉCIMA – DO FORO",
        "Fica eleito o foro da Comarca de {{imovel_cidade}}/{{imovel_uf}} para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
        "",
        "E, por estarem assim justos e contratados, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, juntamente com 2 (duas) testemunhas.",
        "{{imovel_cidade}}/{{imovel_uf}}, [data de assinatura].",
        "",
        "[ASSINATURA] _______________________________________________",
        "VENDEDOR(A) — {{vendedor_nome}} — CPF nº {{vendedor_cpf}}",
        "",
        "[ASSINATURA] _______________________________________________",
        "COMPRADOR(A) — {{comprador_nome}} — CPF nº {{comprador_cpf}}",
        "",
        "TESTEMUNHAS:",
        "1) _________________________________________________ Nome: _________________________ CPF: _______________",
        "2) _________________________________________________ Nome: _________________________ CPF: _______________",
      ],
    },
  },

  // ==========================================================================
  // 6. CONTRATO DE COMODATO
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
        ...camposParteComEndereco("comodante", "do(a) comodante"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados de quem recebe (comodatário)",
        ...camposParteComEndereco("comodatario", "do(a) comodatário(a)"),
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
        ],
      },
    ],
    template: {
      titulo: "CONTRATO DE COMODATO",
      corpo: [
        "Pelo presente contrato, {{comodante_nome}}, {{comodante_estado_civil}}, portador(a) do CPF {{comodante_cpf}}, comodante, entrega em comodato (empréstimo gratuito) a {{comodatario_nome}}, {{comodatario_estado_civil}}, portador(a) do CPF {{comodatario_cpf}}, comodatário, o seguinte bem: {{bem}}.",
        "",
        "## CLÁUSULA PRIMEIRA – DO PRAZO",
        "O prazo do comodato é de {{prazo}}, findo o qual o comodatário deverá devolver o bem nas mesmas condições em que o recebeu.",
        "",
        "## CLÁUSULA SEGUNDA – DA RESTITUIÇÃO",
        "O COMODANTE poderá solicitar a devolução do bem a qualquer momento, independentemente do prazo estipulado, comprometendo-se o COMODATÁRIO a devolvê-lo no prazo de 7 (sete) dias a contar do pedido.",
        "",
        "## CLÁUSULA TERCEIRA – DA CONSERVAÇÃO",
        "O COMODATÁRIO obriga-se a conservar o bem com zelo e diligência, utilizando-o apenas para a finalidade a que se destina, respondendo por qualquer dano decorrente de uso indevido ou negligência.",
        "",
        "{{clausula:responsabilidade}}",
        "{{clausula:uso}}",
        "",
        "## CLÁUSULA FINAL – DO FORO",
        "Fica eleito o foro da Comarca de {{comodante_cidade}}/{{comodante_uf}} para dirimir quaisquer controvérsias oriundas deste contrato.",
        "",
        "E, por estarem assim justos e contratados, as partes assinam o presente instrumento.",
        "{{comodante_cidade}}/{{comodante_uf}}, [data de assinatura].",
        "",
        "[ASSINATURA] _______________________________________________",
        "{{comodante_nome}} — COMODANTE",
        "",
        "[ASSINATURA] _______________________________________________",
        "{{comodatario_nome}} — COMODATÁRIO",
      ],
    },
  },

  // ==========================================================================
  // 7. COMPRA E VENDA DE BENS MÓVEIS (versão simples para bens móveis)
  // ==========================================================================
  {
    slug: "compra-venda",
    nome: "Compra e Venda de Bens",
    desc: "Venda de bens móveis (veículo, equipamento, animal) com recibo formal.",
    quandoUsar:
      "Use quando você vai vender um bem móvel (veículo, equipamento, animal) e quer um recibo formal de compra e venda — mais simples que o contrato de imóvel.",
    categoria: "Comercial",
    minutos: 4,
    popular: false,
    icone: "receipt",
    etapas: [
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Vendedor",
        ...camposParteCompleta("vendedor", "do(a) vendedor(a)"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados do Comprador",
        ...camposParteCompleta("comprador", "do(a) comprador(a)"),
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
        "Pelo presente instrumento, {{vendedor_nome}}, {{vendedor_estado_civil}}, portador(a) do CPF {{vendedor_cpf}}, vendedor, vende e entrega a {{comprador_nome}}, {{comprador_estado_civil}}, portador(a) do CPF {{comprador_cpf}}, comprador, o seguinte bem: {{bem}}.",
        "",
        "## CLÁUSULA PRIMEIRA – DO PREÇO",
        "O valor da venda é de R$ {{valor}}, pago da seguinte forma: {{pagamento}}.",
        "O presente instrumento serve como recibo de pagamento para todos os fins de direito.",
        "",
        "## CLÁUSULA SEGUNDA – DA ENTREGA",
        "A entrega do bem se dá no ato da assinatura, transferindo-se a posse e propriedade ao comprador.",
        "",
        "## CLÁUSULA TERCEIRA – DA GARANTIA",
        "O vendedor declara que o bem está livre e desembaraçado de quaisquer ônus, dívidas ou gravames, respondendo pela evicção nos termos dos arts. 447 a 457 do Código Civil.",
        "",
        "## CLÁUSULA QUARTA – DO FORO",
        "Fica eleito o foro da Comarca do domicílio do vendedor para dirimir quaisquer controvérsias oriundas deste contrato.",
        "",
        "E, por estarem assim justos e contratados, as partes assinam o presente instrumento.",
        "[data de assinatura].",
        "",
        "[ASSINATURA] _______________________________________________",
        "{{vendedor_nome}} — VENDEDOR",
        "",
        "[ASSINATURA] _______________________________________________",
        "{{comprador_nome}} — COMPRADOR",
      ],
    },
  },

  // ==========================================================================
  // 8. UNIÃO ESTÁVEL
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
        ...camposParteCompleta("pessoa1", "da primeira pessoa"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados da segunda pessoa",
        ...camposParteCompleta("pessoa2", "da segunda pessoa"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Data de início e regime de bens",
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
    ],
    template: {
      titulo: "DECLARAÇÃO DE UNIÃO ESTÁVEL",
      corpo: [
        "{{pessoa1_nome}}, {{pessoa1_nacionalidade}}, {{pessoa1_estado_civil}}, portador(a) do CPF {{pessoa1_cpf}}, e {{pessoa2_nome}}, {{pessoa2_nacionalidade}}, {{pessoa2_estado_civil}}, portador(a) do CPF {{pessoa2_cpf}}, por intermédio desta declaração, atestam que vivem em união estável desde {{inicio}}, de forma contínua, pública e duradoura, sob o regime de {{regime}}.",
        "",
        "## CLÁUSULA PRIMEIRA – DA COABITAÇÃO",
        "A coabitação ocorre no endereço: {{endereco}}.",
        "",
        "## CLÁUSULA SEGUNDA – DOS DIREITOS E DEVERES",
        "Os conviventes assumem o dever de lealdade, respeito e assistência mútua, nos termos do art. 1.724 do Código Civil, comprometendo-se a contribuir proporcionalmente para o sustento da família.",
        "",
        "## CLÁUSULA TERCEIRA – DO REGIME DE BENS",
        "Os bens adquiridos durante a união estável serão regidos pelo regime de {{regime}}, nos termos do art. 1.725 do Código Civil.",
        "",
        "## CLÁUSULA QUARTA – DA DISSOLUÇÃO",
        "Em caso de dissolução da união estável, os bens adquiridos em conjunto serão partilhados conforme o regime escolhido, e eventuais alimentos serão fixados por acordo ou judicialmente.",
        "",
        "Esta declaração é firmada para fins de comprovação perante terceiros e órgãos públicos.",
        "{{endereco_cidade}}/{{endereco_uf}}, [data de assinatura].",
        "",
        "[ASSINATURA] _______________________________________________",
        "{{pessoa1_nome}}",
        "",
        "[ASSINATURA] _______________________________________________",
        "{{pessoa2_nome}}",
      ],
    },
  },

  // ==========================================================================
  // 9. PROCURAÇÃO SIMPLES
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
        ...camposParteCompleta("outorgante", "do(a) outorgante"),
      },
      {
        tipo: "campo_grupo",
        tituloGrupo: "Dados de quem vai representar você (outorgado)",
        ...camposParteCompleta("outorgado", "do(a) outorgado(a)"),
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
        "Eu, {{outorgante_nome}}, {{outorgante_nacionalidade}}, {{outorgante_estado_civil}}, {{outorgante_profissao}}, portador(a) do RG nº {{outorgante_rg_separador}} e inscrito(a) no CPF sob o nº {{outorgante_cpf}}, outorgante, nomeio e constituo meu bastante procurador {{outorgado_nome}}, {{outorgado_nacionalidade}}, {{outorgado_estado_civil}}, {{outorgado_profissao}}, portador(a) do RG nº {{outorgado_rg_separador}} e inscrito(a) no CPF sob o nº {{outorgado_cpf}}, outorgado, a quem confiro os seguintes poderes:",
        "",
        "{{poderes}}.",
        "",
        "Para assinar documentos e praticar os atos necessários ao exercício do mandato aqui outorgado, podendo substabelecer esta procuração, no todo ou em parte, com ou sem reserva de iguais poderes.",
        "",
        "Por estar assim de acordo, assino a presente procuração.",
        "[data de assinatura].",
        "",
        "[ASSINATURA] _______________________________________________",
        "{{outorgante_nome}} — OUTORGANTE",
      ],
    },
  },
];

// ============================================================================
// Flatten etapas → campos (backward-compat com hero/catalog/modelo-detalhe)
// ============================================================================
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
