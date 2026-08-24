import { campoEstaVisivel, type CampoModelo, type Modelo } from "../types";

/** Metadado interno, derivado somente da ausência do campo em registros antigos. */
export const SINAL_LEGADO_SEM_FORMA_KEY = "__sinal_legado_sem_forma";

type ModeloComEtapas = Pick<Modelo, "slug"> & Partial<Pick<Modelo, "etapas">>;

function camposCondicionais(modelo: ModeloComEtapas): CampoModelo[] {
  const campos: CampoModelo[] = [];

  for (const etapa of modelo.etapas ?? []) {
    if (etapa.tipo === "campo") {
      campos.push(etapa.campo);
      continue;
    }

    if (etapa.tipo === "campo_grupo") {
      campos.push(...etapa.campos);
      continue;
    }

    for (const clausula of etapa.clausulas) {
      campos.push(...(clausula.camposExtras ?? []));
    }
  }

  return campos.filter((campo) => Boolean(campo.visivelQuando));
}

/**
 * Remove valores que pertencem a campos condicionais atualmente ocultos.
 * O servidor aplica esta limpeza antes de validar/persistir para que clientes
 * antigos ou requests manuais também não consigam carregar dados fantasmas.
 */
export function removerRespostasCondicionaisOcultas(
  modelo: ModeloComEtapas,
  respostas: Record<string, string>
): Record<string, string> {
  const normalized = { ...respostas };
  const campos = camposCondicionais(modelo);

  let changed = true;
  while (changed) {
    changed = false;
    for (const campo of campos) {
      if (
        Object.prototype.hasOwnProperty.call(normalized, campo.key) &&
        !campoEstaVisivel(campo, normalized)
      ) {
        delete normalized[campo.key];
        changed = true;
      }
    }
  }

  return normalized;
}

/**
 * Normaliza apenas respostas legadas cujo significado é mecânico e seguro.
 *
 * Não cria dados registrais, de cidade ou de UF: essas informações continuam
 * ausentes até que a pessoa as atualize no fluxo que valida uma nova versão.
 */
export function normalizarRespostasLegadasDeContrato(
  modelo: ModeloComEtapas,
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

  return removerRespostasCondicionaisOcultas(modelo, normalized);
}
