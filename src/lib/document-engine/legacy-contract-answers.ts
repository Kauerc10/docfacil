import type { Modelo } from "../types";

/**
 * Normaliza apenas respostas legadas cujo significado é mecânico e seguro.
 *
 * Não cria dados registrais, de cidade ou de UF: essas informações continuam
 * ausentes até que a pessoa as atualize no fluxo que valida uma nova versão.
 */
export function normalizarRespostasLegadasDeContrato(
  modelo: Pick<Modelo, "slug">,
  respostas: Record<string, string>
): Record<string, string> {
  const normalized = { ...respostas };

  if (
    modelo.slug === "comodato" &&
    !normalized.periodo_emprestimo?.trim() &&
    normalized.prazo?.trim()
  ) {
    normalized.periodo_emprestimo = normalized.prazo;
  }

  if (
    modelo.slug === "contrato-compra-venda-imovel" &&
    !Object.hasOwn(normalized, "possui_sinal")
  ) {
    normalized.possui_sinal = normalized.sinal?.trim() ? "Sim" : "Não";
  }

  return normalized;
}
