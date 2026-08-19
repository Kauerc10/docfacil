/**
 * Regras jurídicas de renderização que dependem de respostas do usuário.
 *
 * A V1 mantém essas regras deliberadamente pequenas e explícitas. O objetivo
 * é gerar a redação correta sem criar novas etapas no fluxo nem transformar
 * o catálogo de modelos em um AST jurídico complexo.
 *
 * Importante: esta camada ajusta o texto final. Validações que precisam
 * bloquear uma geração inválida continuam no backend/domain.
 */

const RESIDENTIAL_ART_46_LINE =
  "O prazo de locação é de {{prazo}} meses, com início na data da assinatura, findo o qual o contrato se extinguirá de pleno direito, independentemente de notificação ou aviso, nos termos do art. 46 da Lei nº 8.245/1991.";

const RESIDENTIAL_PRORROGATION_LINE =
  "Findo o prazo estipulado, se o LOCATÁRIO permanecer no imóvel por mais de 30 (trinta) dias sem oposição do LOCADOR, a locação prorrogar-se-á por prazo indeterminado, sujeita às mesmas condições pactuadas neste instrumento, salvo denúncia escrita nos termos da lei.";

const RESIDENTIAL_CHARGES_LINE =
  "Correrão por conta exclusiva do LOCATÁRIO, durante toda a vigência do contrato: a) as despesas de consumo de água, esgoto, energia elétrica, gás e internet/TV a cabo, se houver; b) as taxas condominiais ordinárias, incluindo fundo de reserva quando exigido pela convenção condominial; c) o Imposto Predial e Territorial Urbano (IPTU) e taxas municipais incidentes sobre o imóvel, salvo estipulação em contrário.";

const RESIDENTIAL_EXTRAORDINARY_LINE =
  "As despesas condominiais extraordinárias, assim consideradas nos termos do art. 22, § 1º, da Lei nº 8.245/1991, correrão por conta do LOCADOR.";

const COMMERCIAL_CHARGES_LINE =
  "Correrão por conta exclusiva do LOCATÁRIO, durante toda a vigência da locação: a) despesas de consumo (água, esgoto, energia elétrica, gás, internet e telefonia); b) despesas condominiais ordinárias e extraordinárias, quando o imóvel integrar condomínio comercial; c) o IPTU, taxas municipais, e eventual Imposto sobre Serviços (ISS) incidente sobre a própria atividade explorada; d) prêmios de seguro contra incêndio e demais riscos exigidos por lei ou pela administração do imóvel/condomínio.";

function parsePositiveInteger(value: string | undefined): number | null {
  const normalized = (value ?? "").replace(/\D/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Ajusta uma linha do template antes da interpolação dos placeholders.
 * Mantém preview, PDF e demais renderers sincronizados porque todos passam
 * por renderDocument/fillDocument.
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
  }

  if (modelSlug === "contrato-locacao-comercial" && line === COMMERCIAL_CHARGES_LINE) {
    return "Correrão por conta exclusiva do LOCATÁRIO, durante toda a vigência da locação: a) despesas de consumo de água, esgoto, energia elétrica, gás, internet e telefonia; b) despesas condominiais ordinárias; c) o IPTU e taxas municipais, conforme expressamente pactuado neste contrato; d) tributos incidentes sobre a própria atividade explorada; e) prêmios de seguro contra incêndio e demais riscos quando contratualmente atribuídos ao LOCATÁRIO. As despesas condominiais extraordinárias, nos termos do art. 22, § 1º, da Lei nº 8.245/1991, correrão por conta do LOCADOR.";
  }

  return line;
}
