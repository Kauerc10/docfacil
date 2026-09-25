import { describe, expect, test } from "bun:test";
import {
  InMemoryAccessRepository, InMemoryDocumentsRepository,
  InMemoryGenerationCommitRepository, InMemoryGenerationRequestsRepository,
  InMemoryOrdersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { BackendError } from "@/lib/server/errors";

describe("cota de PDFs de IA", () => {
  test("contabiliza só commits concluídos e bloqueia o quarto PDF diário", async () => {
    const docs = new InMemoryDocumentsRepository();
    const requests = new InMemoryGenerationRequestsRepository();
    const commit = new InMemoryGenerationCommitRepository(docs, new InMemoryAccessRepository(), new InMemoryOrdersRepository(), requests);
    const now = Date.now();
    for (let index = 0; index < 4; index++) {
      const requestId = crypto.randomUUID();
      const doc = await docs.createDocument({
        owner: { type: "user", userId: "pilot" }, modeloSlug: `ai-${index}`, modeloNome: "Documento IA",
        source: "ai", respostas: {}, entitlement: { type: "ai_beta", watermarked: false },
        artifactState: "generating", currentVersion: null, targetVersion: 1, createdAt: now, updatedAt: now,
      });
      await requests.getOrCreateRequest(requestId, { operation: "initial", principalKey: "user:pilot", documentId: "pending", targetVersion: 1 });
      const execute = () => commit.commitGeneratedArtifact({
        requestId, documentId: doc.id!, targetVersion: 1, respostas: {}, now,
        artifact: { version: 1, objectKey: `documents/${doc.id}/v1/document.pdf`, sha256: "hash", sizeBytes: 100,
          mimeType: "application/pdf", filename: "doc.pdf", watermarked: false, sourceHash: "source", modelSnapshotHash: "model", generatedAt: now },
        aiQuota: { userId: "pilot", day: "2026-09-25", limit: 3 },
      });
      if (index < 3) await execute();
      else {
        try { await execute(); throw new Error("Expected quota rejection"); }
        catch (error) { expect(error).toBeInstanceOf(BackendError); expect((error as BackendError).code).toBe("FREE_LIMIT_REACHED"); }
      }
    }
  });
});
