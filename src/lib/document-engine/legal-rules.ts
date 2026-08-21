/**
 * Regras jurídicas/editoriais de renderização dependentes do modelo/respostas.
 *
 * A V1 mantém esta camada pequena e explícita. O catálogo continua simples
 * para quem preenche; o engine corrige redações condicionais e defaults de
 * segurança sem multiplicar etapas na interface.
 *
 * Validações que precisam BLOQUEAR uma geração inválida continuam no
 * backend/domain. Aqui tratamos a redação final compartilhada por preview/PDF.
 */

/**
 * Versão material das regras que podem alterar o documento renderizado sem
 * modificar diretamente o template bruto do catálogo. Deve ser incrementada
 * sempre que uma regra abaixo mudar o conteúdo jurídico/editorial final.
 */
export const DOCUMENT_RENDER_RULES_VERSION = "2026-08-20.6";

const RESIDENTIAL_ART_46_LINE =
  "O prazo de locação é de {{prazo}} meses, com início na data da assinatura, findo o qual o contrato se extinguirá de pleno direito, independentemente de notificação ou aviso, nos termos do art. 46 da Lei nº 8.245/1991.";
const RESIDENTIAL_PRORROGATION_LINE =
  "Findo o prazo estipulado, se o LOCATÁRIO permanecer no imóvel por mais de 30 (trinta) dias sem oposição do LOCADOR, a locação prorrogar-se-á por prazo indeterminado, sujeita às mesmas condições pactuadas neste instrumento, salvo denúncia escrita nos termos da lei.";
const RESIDENTIAL_CHARGES_LINE =
  "Correrão por conta exclusiva do LOCATÁRIO, durante toda a vigência do contrato: a) as despesas de consumo de água, esgoto, energia elétrica, gás e internet/TV a cabo, se houver; b) as taxas condominiais ordinárias, incluindo fundo de reserva quando exigido pela convenção condominial; c) o Imposto Predial e Territorial Urbano (IPTU) e taxas municipais incidentes sobre o imóvel, salvo estipulação em contrário.";
const RESIDENTIAL_EXTRAORDINARY_LINE =
  "As despesas condominiais extraordinárias, assim consideradas nos termos do art. 22, § 1º, da Lei nº 8.245/1991, correrão por conta do LOCADOR.";
const RESIDENTIAL_MAINTENANCE_LINE =
  "Incumbem ao LOCATÁRIO os reparos decorrentes do uso normal do IMÓVEL e de pequenos consertos de manutenção, enquanto os reparos estruturais e os decorrentes de desgaste natural, deterioração pelo tempo ou vício de construção são de responsabilidade do LOCADOR, nos termos dos arts. 22 e 23 da Lei nº 8.245/1991.";
const RESIDENTIAL_INSPECTION_HEADING =
  "## CLÁUSULA DÉCIMA PRIMEIRA – DA VISTORIA";
const RESIDENTIAL_INSPECTION_LINE =
  "As PARTES declaram ter vistoriado o IMÓVEL previamente à assinatura deste contrato, encontrando-o em condições adequadas à finalidade a que se destina, conforme Termo de Vistoria com registro fotográfico anexo (Anexo I), que passa a integrar este instrumento para todos os fins.";
const RESIDENTIAL_PRIVACY_LINE =
  "As PARTES declaram estar cientes de que os dados pessoais constantes deste instrumento serão tratados exclusivamente para as finalidades relacionadas à execução, fiscalização e eventual cobrança decorrente deste contrato, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais), sendo vedado o uso para finalidade diversa sem consentimento específico.";
const RESIDENTIAL_PRIVACY_HEADING =
  "## CLÁUSULA DÉCIMA SEGUNDA – DA PROTEÇÃO DE DADOS PESSOAIS";
const RESIDENTIAL_COMMUNICATIONS_HEADING =
  "## CLÁUSULA DÉCIMA TERCEIRA – DAS COMUNICAÇÕES ENTRE AS PARTES";
const RESIDENTIAL_GENERAL_HEADING =
  "## CLÁUSULA DÉCIMA QUARTA – DAS DISPOSIÇÕES GERAIS";
const RESIDENTIAL_FORUM_HEADING =
  "## CLÁUSULA DÉCIMA QUINTA – DO FORO";
const COMMERCIAL_CHARGES_LINE =
  "Correrão por conta exclusiva do LOCATÁRIO, durante toda a vigência da locação: a) despesas de consumo (água, esgoto, energia elétrica, gás, internet e telefonia); b) despesas condominiais ordinárias e extraordinárias, quando o imóvel integrar condomínio comercial; c) o IPTU, taxas municipais, e eventual Imposto sobre Serviços (ISS) incidente sobre a própria atividade explorada; d) prêmios de seguro contra incêndio e demais riscos exigidos por lei ou pela administração do imóvel/condomínio.";
const COMMERCIAL_INSPECTION_PLACEHOLDER = "{{vistoria_comercial}}";

const RESIDENCE_SUBTITLE =
  "(Declaração firmada sob as penas da lei — art. 299 do Código Penal)";
const RESIDENCE_OPENING =
  "Eu, {{declarante_nome}}, {{declarante_nacionalidade}}, {{declarante_estado_civil}}, {{declarante_profissao}}, portador(a) da Cédula de Identidade (RG) nº {{declarante_rg_separador}} e inscrito(a) no Cadastro de Pessoas Físicas (CPF/MF) sob o nº {{declarante_cpf}}, DECLARO, sob as penas da lei, para os devidos fins de direito e onde se fizer necessário, que resido atualmente no seguinte endereço:";
const RESIDENCE_RECOGNITION_NOTE =
  "Observação: Para maior segurança jurídica perante bancos, órgãos públicos ou processos seletivos, recomenda-se o reconhecimento de firma em Cartório de Notas, bem como a juntada de um comprovante de residência em nome do declarante.";

const THIRD_PARTY_OPENING =
  "Eu, {{declarante_nome}}, {{declarante_nacionalidade}}, portadora da cédula de identidade nº {{declarante_rg_separador}} e inscrita no CPF nº {{declarante_cpf}}, declaro para devidos fins que {{residente_nome}}, {{residente_documento}} e inscrito no CPF nº {{residente_cpf}}, reside no imóvel situado na {{declarante_endereco}}.";

const REAL_ESTATE_INTRO =
  "têm entre si justo e contratado o presente Instrumento Particular de Compra e Venda de Imóvel, mediante as cláusulas e condições a seguir:";
const REAL_ESTATE_OBJECT_TRANSFER =
  "Pelo presente instrumento, o VENDEDOR vende, e o COMPRADOR compra, o IMÓVEL acima descrito, livre e desembaraçado de quaisquer ônus, dívidas, hipotecas, penhoras ou gravames de qualquer natureza.";
const REAL_ESTATE_PRICE =
  "O preço certo e ajustado para a presente compra e venda é de R$ {{valor}}, a ser pago pelo COMPRADOR ao VENDEDOR da seguinte forma:";
const REAL_ESTATE_ARRAS =
  'As arras mencionadas na Cláusula Segunda, alínea "a", têm caráter confirmatório do negócio, nos termos dos arts. 417 a 420 do Código Civil. Caso o COMPRADOR desista injustificadamente do negócio, perderá o valor das arras em favor do VENDEDOR. Caso a desistência parta do VENDEDOR, este deverá restituir ao COMPRADOR o valor das arras em dobro, devidamente atualizado.';
const REAL_ESTATE_ARRAS_PLACEHOLDER = "{{clausula:arras}}";
const REAL_ESTATE_POSSESSION =
  "A posse do IMÓVEL será transmitida ao COMPRADOR na data de quitação integral do preço / assinatura da escritura pública, momento a partir do qual correrão por conta do COMPRADOR todas as despesas de manutenção, condomínio, tributos e demais encargos incidentes sobre o imóvel.";
const REAL_ESTATE_DEED =
  "Quitado integralmente o preço, as partes se obrigam a outorgar e receber a competente Escritura Pública de Compra e Venda, no Tabelionato de Notas de livre escolha do COMPRADOR, no prazo de 30 (trinta) dias, ficando desde já ajustado que a presente compra e venda somente se aperfeiçoa e produz efeitos erga omnes (perante terceiros) após o registro do respectivo título na matrícula do imóvel, no Cartório de Registro de Imóveis competente, nos termos do art. 1.245 do Código Civil.";

const MOVABLE_RECEIPT =
  "O presente instrumento, após assinado por ambas as partes, servirá como recibo de quitação das parcelas pagas na data da assinatura.";
const MOVABLE_FORUM =
  "Fica eleito o foro da Comarca de {{vendedor_cidade}}/{{vendedor_uf}} para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato.";
const MOVABLE_CLOSING = "{{vendedor_cidade}}/{{vendedor_uf}}, [data de assinatura].";

const UNION_OPENING =
  "Por este instrumento particular de Declaração de União Estável, as declarantes:";
const UNION_CLOSING =
  "Esta declaração é firmada de livre e comum acordo para a produção de todos os efeitos jurídicos legais.";

const POWER_OF_ATTORNEY_SCOPE =
  "Para assinar documentos e praticar os atos necessários ao exercício do mandato aqui outorgado, podendo substabelecer esta procuração, no todo ou em parte, com ou sem reserva de iguais poderes.";

function parsePositiveInteger(value: string | undefined): number | null {
  const normalized = (value ?? "").replace(/\D/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Título final compartilhado entre preview e PDF. */
export function applyLegalTitleRule(
  modelSlug: string | undefined,
  title: string
): string {
  if (modelSlug === "contrato-compra-venda-imovel") {
    return "INSTRUMENTO PARTICULAR DE COMPROMISSO DE COMPRA E VENDA DE IMÓVEL";
  }
  return title;
}

/**
 * Ajusta uma linha do template ANTES da interpolação dos placeholders.
 * Preview, detalhes e PDF passam por esta mesma regra.
 */
export function applyLegalTemplateRule(
  modelSlug: string | undefined,
  line: string,
  answers: Record<string, string>
): string {
  if (modelSlug === "contrato-locacao") {
    const prazo = parsePositiveInteger(answers.prazo);

    if (line === RESIDENTIAL_ART_46_LINE && prazo !== null && prazo < 30) {
      return "O prazo de locação é de {{prazo}} meses, com início na data da assinatura. Por se tratar de locação residencial ajustada por prazo inferior a 30 (trinta) meses, ao término do prazo a locação prorrogar-se-á automaticamente por prazo indeterminado, nos termos do art. 47 da Lei nº 8.245/1991.";
    }

    if (line === RESIDENTIAL_PRORROGATION_LINE && prazo !== null && prazo < 30) {
      return "Durante a prorrogação por prazo indeterminado, permanecem aplicáveis as demais condições deste contrato, e a retomada do imóvel pelo LOCADOR observará as hipóteses previstas em lei.";
    }

    if (line === RESIDENTIAL_CHARGES_LINE) {
      return "Correrão por conta exclusiva do LOCATÁRIO, durante toda a vigência do contrato: a) as despesas de consumo de água, esgoto, energia elétrica, gás e internet/TV a cabo, se houver; b) as despesas condominiais ordinárias e a reposição do fundo de reserva quando utilizada para custear despesas ordinárias ocorridas durante a locação, ressalvados valores referentes a período anterior; c) o Imposto Predial e Territorial Urbano (IPTU) e taxas municipais incidentes sobre o imóvel, conforme expressamente pactuado neste contrato.";
    }

    if (line === RESIDENTIAL_EXTRAORDINARY_LINE) {
      return "As despesas condominiais extraordinárias, incluindo a constituição do fundo de reserva, assim consideradas nos termos do art. 22, § 1º, da Lei nº 8.245/1991, correrão por conta do LOCADOR.";
    }

    if (line === RESIDENTIAL_MAINTENANCE_LINE) {
      return "O LOCATÁRIO responderá pelos danos causados por si, seus dependentes, familiares, visitantes ou prepostos e deverá providenciar os reparos que lhes forem imputáveis. Reparos estruturais, vícios ou defeitos anteriores à locação e desgaste natural decorrente do uso regular do IMÓVEL são de responsabilidade do LOCADOR, observadas as obrigações legais de cada parte.";
    }

    const possuiVistoriaAnexa = /^sim/i.test(answers.vistoria_anexa?.trim() ?? "");

    if (line === RESIDENTIAL_INSPECTION_HEADING) {
      return possuiVistoriaAnexa ? line : "";
    }

    if (line === RESIDENTIAL_INSPECTION_LINE) {
      return possuiVistoriaAnexa
        ? "As PARTES declaram ter vistoriado o IMÓVEL previamente à assinatura deste contrato. O Termo de Vistoria e o registro fotográfico informados pelas PARTES integram este instrumento como Anexo I."
        : "";
    }

    if (!possuiVistoriaAnexa) {
      if (line === RESIDENTIAL_PRIVACY_HEADING) {
        return "## CLÁUSULA DÉCIMA PRIMEIRA – DA PROTEÇÃO DE DADOS PESSOAIS";
      }

      if (line === RESIDENTIAL_COMMUNICATIONS_HEADING) {
        return "## CLÁUSULA DÉCIMA SEGUNDA – DAS COMUNICAÇÕES ENTRE AS PARTES";
      }

      if (line === RESIDENTIAL_GENERAL_HEADING) {
        return "## CLÁUSULA DÉCIMA TERCEIRA – DAS DISPOSIÇÕES GERAIS";
      }

      if (line === RESIDENTIAL_FORUM_HEADING) {
        return "## CLÁUSULA DÉCIMA QUARTA – DO FORO";
      }
    }

    if (line === RESIDENTIAL_PRIVACY_LINE) {
      return "Os dados pessoais constantes deste instrumento serão tratados pelas PARTES na medida necessária à execução deste contrato, ao exercício regular de direitos e ao cumprimento de obrigações legais ou regulatórias aplicáveis, observada a Lei nº 13.709/2018.";
    }
  }

  if (modelSlug === "contrato-locacao-comercial") {
    if (line === COMMERCIAL_CHARGES_LINE) {
      return "Correrão por conta exclusiva do LOCATÁRIO, durante toda a vigência da locação: a) despesas de consumo de água, esgoto, energia elétrica, gás, internet e telefonia; b) despesas condominiais ordinárias; c) o IPTU e taxas municipais, conforme expressamente pactuado neste contrato; d) tributos incidentes sobre a própria atividade explorada; e) prêmios de seguro contra incêndio e demais riscos quando contratualmente atribuídos ao LOCATÁRIO. As despesas condominiais extraordinárias, nos termos do art. 22, § 1º, da Lei nº 8.245/1991, correrão por conta do LOCADOR.";
    }

    if (line === COMMERCIAL_INSPECTION_PLACEHOLDER) {
      return /^sim$/i.test(answers.vistoria_anexa?.trim() ?? "")
        ? "As PARTES declaram que o Termo de Vistoria e o registro fotográfico são documentos apartados, assinados e juntados pelas PARTES, sem declaração de upload pela plataforma."
        : "";
    }
  }

  if (modelSlug === "declaracao-residencia") {
    if (line === RESIDENCE_SUBTITLE) {
      return "(Declaração de residência nos termos da Lei nº 7.115/1983, firmada sob responsabilidade do declarante e sob as penas da lei)";
    }
    if (line === RESIDENCE_OPENING) {
      return "Eu, {{declarante_nome}}, {{declarante_nacionalidade}}, {{declarante_estado_civil}}, {{declarante_profissao}}, titular do CPF nº {{declarante_cpf}}{{declarante_rg_separador}}, DECLARO, sob minha responsabilidade e sob as penas da lei, para os fins da Lei nº 7.115/1983 e para os devidos fins, que resido atualmente no seguinte endereço:";
    }
    if (line === RESIDENCE_RECOGNITION_NOTE) {
      return "";
    }
  }

  if (modelSlug === "declaracao-residencia-terceiro" && line === THIRD_PARTY_OPENING) {
    return "Eu, {{declarante_nome}}, {{declarante_nacionalidade}}, titular do CPF nº {{declarante_cpf}}{{declarante_rg_separador}}, DECLARO, sob minha responsabilidade e sob as penas da lei, que {{residente_nome}}, identificado(a) por {{residente_documento}}, titular do CPF nº {{residente_cpf}}, reside no imóvel situado na {{declarante_endereco}}.";
  }

  if (modelSlug === "contrato-compra-venda-imovel") {
    const possuiSinal = /^sim$/i.test(answers.possui_sinal?.trim() ?? "");

    if (line === REAL_ESTATE_INTRO) {
      return "têm entre si justo e contratado o presente Instrumento Particular de Compromisso de Compra e Venda de Imóvel, mediante as cláusulas e condições a seguir:";
    }
    if (line === REAL_ESTATE_OBJECT_TRANSFER) {
      return "Pelo presente instrumento, o VENDEDOR promete vender e o COMPRADOR promete comprar o IMÓVEL acima descrito, observadas as condições deste compromisso e as formalidades legalmente exigíveis para a transferência da propriedade.";
    }
    if (line === REAL_ESTATE_PRICE) {
      return "O preço certo e ajustado para o presente compromisso é de R$ {{valor}}, a ser pago pelo COMPRADOR ao VENDEDOR da seguinte forma:";
    }
    if (line === REAL_ESTATE_ARRAS || line === REAL_ESTATE_ARRAS_PLACEHOLDER) {
      if (!possuiSinal) return "";
      return 'Sinal e princípio de pagamento (arras confirmatórias) no valor de R$ {{sinal}}, pago mediante {{forma_pagamento_sinal}}. As arras têm caráter confirmatório do negócio, nos termos dos arts. 417 a 420 do Código Civil. Em caso de inexecução imputável ao COMPRADOR, o VENDEDOR poderá considerar desfeito o compromisso e reter as arras. Se a inexecução for imputável ao VENDEDOR, o COMPRADOR poderá considerar desfeito o compromisso e exigir a devolução das arras mais o equivalente, com atualização monetária, juros e honorários de advogado, nos termos do art. 418 do Código Civil. Permanecem ressalvados os direitos previstos no art. 419 do Código Civil.';
    }
    if (line === REAL_ESTATE_POSSESSION) {
      return "A posse do IMÓVEL será transmitida ao COMPRADOR após a quitação integral do preço e a entrega das chaves, salvo se as partes formalizarem por escrito outro momento de imissão na posse. A partir da efetiva posse correrão por conta do COMPRADOR as despesas de manutenção, condomínio, tributos e demais encargos incidentes sobre o imóvel.";
    }
    if (line === REAL_ESTATE_DEED) {
      return "Quitado integralmente o preço, as partes se obrigam a praticar os atos necessários à formalização definitiva do negócio. Quando exigida pelo art. 108 do Código Civil, será lavrada a competente Escritura Pública de Compra e Venda; a transferência da propriedade ocorrerá com o registro do título translativo na matrícula do imóvel perante o Registro de Imóveis competente, nos termos do art. 1.245 do Código Civil.";
    }
  }

  if (modelSlug === "compra-venda") {
    if (line === MOVABLE_RECEIPT) {
      return "O presente instrumento comprova o negócio celebrado e dá quitação somente dos valores expressamente declarados como pagos na forma de pagamento acima, não presumindo quitação de saldo ainda pendente.";
    }

    const possuiLocalVendedor = Boolean(
      answers.vendedor_cidade?.trim() && answers.vendedor_uf?.trim()
    );
    if (line === MOVABLE_FORUM && !possuiLocalVendedor) {
      return "Fica eleito o foro do domicílio do VENDEDOR para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato.";
    }
    if (line === MOVABLE_CLOSING && !possuiLocalVendedor) {
      return "[data de assinatura].";
    }
  }

  if (modelSlug === "uniao-estavel") {
    if (line === UNION_OPENING) {
      return "Por este instrumento particular de Declaração de União Estável, as partes declarantes:";
    }
    if (line === UNION_CLOSING) {
      return "Esta declaração registra a manifestação livre das partes sobre a convivência e as condições aqui declaradas, sem dispensar requisitos legais ou documentos adicionais que possam ser exigidos conforme a finalidade de uso.";
    }
  }

  if (modelSlug === "procuracao-simples" && line === POWER_OF_ATTORNEY_SCOPE) {
    return "Os poderes conferidos ficam limitados aos atos expressamente descritos neste instrumento e não abrangem atos que exijam poderes especiais e expressos além dos aqui concedidos. O substabelecimento não é autorizado por esta procuração.";
  }

  return line;
}
