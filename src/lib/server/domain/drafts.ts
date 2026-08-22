import "server-only";
import { z } from "zod";

export interface AccountDraft {
  id: string;
  ownerUserId: string;
  modeloSlug: string;
  sourceDocumentId?: string;
  respostas: Record<string, string>;
  stepIndex: number;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
  createdAt: number;
  updatedAt: number;
}

export const accountDraftInputSchema = z.object({
  draftId: z.string().min(1).max(160).optional(),
  modeloSlug: z.string().min(1).max(100),
  sourceDocumentId: z.string().min(1).max(160).optional(),
  respostas: z.record(z.string().min(1).max(100), z.string().max(10000)).default({}),
  stepIndex: z.number().int().min(0).max(500).default(0),
  clausulasSelecionadas: z.array(z.string().min(1).max(100)).max(50).default([]),
  extrasPorClausula: z
    .record(
      z.string().min(1).max(100),
      z.record(z.string().min(1).max(100), z.string().max(10000))
    )
    .default({}),
});

export type AccountDraftInput = z.infer<typeof accountDraftInputSchema>;
