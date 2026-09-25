import { describe, expect, test } from "bun:test";
import { syntheticModel } from "./finalize";
import { generatePdfServer } from "@/lib/pdf/server";
import type { AIDocumentSession } from "@/lib/ai/types";

describe("PDF de rascunho aprovado", () => {
  test("renderiza seções dinâmicas com o motor existente", async () => {
    const now = Date.now();
    const session: AIDocumentSession = {
      id: crypto.randomUUID(), ownerId: "pilot", request: "Registrar empréstimo", status: "approved", version: 4,
      approvedVersion: 4, questions: [], answers: {}, references: [], warnings: [], revisions: 0, llmCalls: 2,
      createdAt: now, updatedAt: now, expiresAt: now + 30 * 86_400_000,
      draft: {
        title: "Termo de empréstimo de notebook",
        sections: [
          { title: "Objeto", paragraphs: ["Ana entrega um notebook Dell a Bruno para uso temporário por trinta dias."] },
          { title: "Devolução", paragraphs: ["Bruno devolverá o notebook a Ana ao final do período acordado."] },
        ],
        referenceIds: [],
      },
    };
    const model = syntheticModel(session);
    expect(model.template.corpo).toContain("OBJETO");
    const pdf = await generatePdfServer(model, {}, { watermark: false });
    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
