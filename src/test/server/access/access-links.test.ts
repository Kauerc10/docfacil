import { describe, expect, it, beforeEach } from "bun:test";
import { POST } from "@/app/api/access/download/route";
import {
  InMemoryDocumentsRepository,
  InMemoryAccessRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import { setArtifactStorageForTesting } from "@/lib/server/r2/storage";
import { hashToken } from "@/lib/server/domain/documents";

describe("Access Links & Magic Link Hardening (POST /api/access/download)", () => {
  let docsRepo: InMemoryDocumentsRepository;
  let accessRepo: InMemoryAccessRepository;
  let storage: InMemoryArtifactStorage;

  beforeEach(() => {
    docsRepo = new InMemoryDocumentsRepository();
    accessRepo = new InMemoryAccessRepository();
    storage = new InMemoryArtifactStorage();

    setRepositoriesForTesting({
      documents: docsRepo,
      access: accessRepo,
    });
    setArtifactStorageForTesting(storage);
  });

  it("returns downloadUrl and increments accessCount for valid active link", async () => {
    const rawToken = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const tokenHash = hashToken(rawToken);

    const doc = await docsRepo.createDocument({
      owner: { type: "guest", contact: { email: "guest@example.com" } },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {},
      entitlement: { type: "single_purchase", watermarked: false },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await docsRepo.saveArtifact(doc.id!, {
      version: 1,
      objectKey: `documents/${doc.id}/v1.pdf`,
      filename: "declaracao.pdf",
      sizeBytes: 1234,
      mimeType: "application/pdf",
      watermarked: false,
      sha256: "hash123",
      sourceHash: "src123",
      modelSnapshotHash: "mod123",
      generatedAt: Date.now(),
    });

    await storage.putArtifact({
      documentId: doc.id!,
      version: 1,
      pdfBuffer: Buffer.from("pdf buffer"),
      filename: "declaracao.pdf",
    });

    await accessRepo.createAccessLink({
      tokenHash,
      kind: "guest",
      documentId: doc.id!,
      version: 1,
      active: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60, // 1h in future
    });

    const req = new Request("http://localhost:3000/api/access/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawToken }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.downloadUrl).toBeDefined();

    const link = await accessRepo.getAccessLink(tokenHash);
    expect(link?.accessCount).toBe(1);
    expect(link?.lastAccessedAt).toBeDefined();
  });

  it("rejects expired link with 410 ACCESS_LINK_INVALID", async () => {
    const rawToken = "expired_token_1234567890_abcdef";
    const tokenHash = hashToken(rawToken);

    await accessRepo.createAccessLink({
      tokenHash,
      kind: "guest",
      documentId: "doc_1",
      version: 1,
      active: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 35,
      expiresAt: Date.now() - 1000, // expired 1s ago
    });

    const req = new Request("http://localhost:3000/api/access/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawToken }),
    });

    const res = await POST(req);
    expect(res.status).toBe(410);
    const data = await res.json();
    expect(data.error.code).toBe("ACCESS_LINK_INVALID");
  });

  it("rejects link pointing to deleted document with 404 DOCUMENT_NOT_FOUND", async () => {
    const rawToken = "valid_token_deleted_doc_123456";
    const tokenHash = hashToken(rawToken);

    const doc = await docsRepo.createDocument({
      owner: { type: "guest", contact: { email: "guest@example.com" } },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {},
      entitlement: { type: "single_purchase", watermarked: false },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await docsRepo.markDocumentDeleted(doc.id!, false);

    await accessRepo.createAccessLink({
      tokenHash,
      kind: "guest",
      documentId: doc.id!,
      version: 1,
      active: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 100000,
    });

    const req = new Request("http://localhost:3000/api/access/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawToken }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe("DOCUMENT_NOT_FOUND");
  });
});
