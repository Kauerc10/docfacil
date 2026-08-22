import type { AccountDraftData } from "./client";

export function buildAccountDraftFinalizationAnswers(
  draft: AccountDraftData
): Record<string, string> {
  const answers = { ...draft.respostas };

  for (const extras of Object.values(draft.extrasPorClausula || {})) {
    for (const [key, value] of Object.entries(extras)) {
      answers[key] = value;
    }
  }

  return answers;
}
