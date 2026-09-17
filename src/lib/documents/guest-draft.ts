import type { GuestDraftData } from "./client";
import { compileDraftAnswers } from "./client-document";

export function buildGuestFinalizationAnswers(
  draft: GuestDraftData
): Record<string, string> {
  return compileDraftAnswers({
    answers: draft.answers,
    clausulasSelecionadas: draft.clausulasSelecionadas,
    extrasPorClausula: draft.extrasPorClausula,
  });
}
