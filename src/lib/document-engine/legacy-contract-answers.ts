import type { Modelo } from "../types";

/** Metadado interno, derivado somente da ausência do campo em registros antigos. */
export const SINAL_LEGADO_SEM_FORMA_KEY = "__sinal_legado_sem_forma";

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
    const possuiSinalLegado = Boolean(normalized.sinal?.trim());
    normalized.possui_sinal = possuiSinalLegado ? "Sim" : "Não";

    if (possuiSinalLegado && !normalized.forma_pagamento_sinal?.trim()) {
      normalized[SINAL_LEGADO_SEM_FORMA_KEY] = "true";
    }
  }

  return normalized;
}
