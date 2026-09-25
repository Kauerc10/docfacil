import { z } from "zod";

export const aiSectionSchema = z.object({
  title: z.string().trim().min(2).max(120),
  paragraphs: z.array(z.string().trim().min(10).max(4000)).min(1).max(12),
});

export const aiDraftSchema = z.object({
  title: z.string().trim().min(5).max(150),
  sections: z.array(aiSectionSchema).min(2).max(16),
  referenceIds: z.array(z.string()).max(20),
});

export const aiEditableDraftSchema = z.object({
  title: z.string().max(150),
  sections: z.array(z.object({ title: z.string().max(120), paragraphs: z.array(z.string().max(4000)).min(1).max(12) })).min(2).max(16),
  referenceIds: z.array(z.string()).max(20),
});

export type AIDocumentDraft = z.infer<typeof aiDraftSchema>;

export interface ClauseReference {
  id: string;
  text: string;
  source: string;
  version: string;
  category: string;
  context: "private" | "general";
  kind: "internal_template" | "legislation" | "official_example";
}

export type AIStatus =
  | "classifying" | "blocked" | "standard" | "model_choice" | "collecting"
  | "drafting" | "reviewing" | "approved" | "completed" | "paused";

export interface AIUsageReservation {
  operationId: string;
  kind: "session" | "llm" | "revision" | "pdf";
  status: "reserved" | "completed" | "released";
  createdAt: number;
}

export interface AIDocumentSession {
  id: string;
  ownerId: string;
  request: string;
  status: AIStatus;
  version: number;
  documentType?: string;
  blockReason?: string;
  modelSuggestion?: { slug: string; name: string };
  modelChoice?: "standard" | "ai";
  questions: string[];
  answers: Record<string, string>;
  draft?: AIDocumentDraft;
  references: ClauseReference[];
  warnings: string[];
  validation?: { version: number; issues: string[] };
  approvedVersion?: number;
  documentId?: string;
  finalizingRequestId?: string;
  finalizingAt?: number;
  revisions: number;
  llmCalls: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  lastOperationId?: string;
  pendingResume?: unknown;
  pendingStage?: AIStatus;
}

export const MAX_AI_WORDS = 3000;

export function countDraftWords(draft: AIDocumentDraft): number {
  return [draft.title, ...draft.sections.flatMap((s) => [s.title, ...s.paragraphs])]
    .join(" ").trim().split(/\s+/u).filter(Boolean).length;
}

export function validateDraft(draft: AIDocumentDraft, references: ClauseReference[], answers: Record<string, string>): string[] {
  const issues: string[] = [];
  const text = [draft.title, ...draft.sections.flatMap((s) => [s.title, ...s.paragraphs])].join("\n");
  if (countDraftWords(draft) > MAX_AI_WORDS) issues.push("O documento excede 3.000 palavras.");
  if (draft.title.trim().length < 5 || draft.sections.some((section) => section.title.trim().length < 2 || section.paragraphs.some((p) => p.trim().length < 10))) {
    issues.push("Preencha o título, as seções e os parágrafos antes de aprovar.");
  }
  if (/\{\{|\}\}|\[(?:INSERIR|PREENCHER|NOME|CPF|DATA|ENDEREÇO|VALOR)[^\]]*\]|<[^>]+>/iu.test(text)) {
    issues.push("O documento contém marcador ou HTML não resolvido.");
  }
  const allowed = new Set(references.map((r) => r.id));
  if (draft.referenceIds.some((id) => !allowed.has(id))) issues.push("O documento cita uma referência não recuperada.");
  if (Object.values(answers).some((value) => !value.trim())) issues.push("Há informações solicitadas ainda sem resposta.");
  return issues;
}
