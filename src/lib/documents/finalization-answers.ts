import { campoEstaVisivel, type CampoModelo, type Modelo } from "@/lib/types";

function conditionalFields(modelo: Modelo): CampoModelo[] {
  const fields: CampoModelo[] = [];

  for (const etapa of modelo.etapas ?? []) {
    if (etapa.tipo === "campo") {
      fields.push(etapa.campo);
      continue;
    }

    if (etapa.tipo === "campo_grupo") {
      fields.push(...etapa.campos);
      continue;
    }

    for (const clausula of etapa.clausulas) {
      fields.push(...(clausula.camposExtras ?? []));
    }
  }

  return fields.filter((field) => Boolean(field.visivelQuando));
}

/**
 * Remove respostas de campos que deixaram de estar visíveis antes de cruzar
 * a fronteira de finalização. Assim uma escolha como `Sim -> preencher -> Não`
 * não mantém dados antigos escondidos no payload do documento.
 */
export function pruneHiddenConditionalAnswers(
  answers: Record<string, string>,
  modelo: Modelo
): Record<string, string> {
  const next = { ...answers };
  const fields = conditionalFields(modelo);

  // Repete até estabilizar para cobrir dependências condicionais em cadeia.
  let changed = true;
  while (changed) {
    changed = false;
    for (const field of fields) {
      if (
        Object.prototype.hasOwnProperty.call(next, field.key) &&
        !campoEstaVisivel(field, next)
      ) {
        delete next[field.key];
        changed = true;
      }
    }
  }

  return next;
}

/**
 * Keeps answers in their form shape until the server validates and composes
 * them. Some fields (such as authorized residents) are structured JSON at
 * this boundary and must not be replaced by their PDF-ready text yet.
 */
export function buildFinalizationAnswers(
  answers: Record<string, string>,
  extrasPorClausula: Record<string, Record<string, string>>,
  modelo?: Modelo
): Record<string, string> {
  const finalAnswers = { ...answers };

  for (const extraMap of Object.values(extrasPorClausula)) {
    Object.assign(finalAnswers, extraMap);
  }

  return modelo
    ? pruneHiddenConditionalAnswers(finalAnswers, modelo)
    : finalAnswers;
}
