import type { AccountDraftData } from "./client";
import { compileDraftAnswers } from "./client-document";

export function buildAccountDraftFinalizationAnswers(
  draft: AccountDraftData
): Record<string, string> {
  return compileDraftAnswers(draft);
}
