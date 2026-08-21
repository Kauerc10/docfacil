import type { GuestDraftData } from "./client";

export function buildGuestFinalizationAnswers(
  draft: GuestDraftData
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(draft.answers || {})) {
    if (!key.startsWith("__")) {
      result[key] = value;
    }
  }

  const selectedClauses = draft.clausulasSelecionadas || [];
  const extrasMap = draft.extrasPorClausula || {};

  for (const clauseId of selectedClauses) {
    const extras = extrasMap[clauseId];
    if (!extras) continue;

    for (const [key, value] of Object.entries(extras)) {
      if (!key.startsWith("__")) {
        result[key] = value;
      }
    }
  }

  return result;
}
