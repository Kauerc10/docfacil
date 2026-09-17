import { compileDraftAnswers } from "./client-document";

/**
 * Keeps answers in their form shape until the server validates and composes
 * them. Some fields (such as authorized residents) are structured JSON at
 * this boundary and must not be replaced by their PDF-ready text yet.
 */
export function buildFinalizationAnswers(
  answers: Record<string, string>,
  extrasPorClausula: Record<string, Record<string, string>>
): Record<string, string> {
  return compileDraftAnswers({
    respostas: answers,
    extrasPorClausula,
  });
}
