import { describe, expect, it, beforeEach } from "bun:test";
import { DELETE } from "@/app/api/documents/[id]/route";
import {
  InMemoryDocumentsRepository,
  InMemoryAccessRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import { setArtifactStorageForTesting } from "@/lib/server/r2/storage";
import { setAdminAuthForTesting } from "@/lib/server/firebase-admin";

describe("DELETE /api/documents/:id (Secure Deletion & Soft-delete Fallback)", () => {
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

  it("successfully purges artifacts and marks document as deleted for owner", async () => {
    setAdminAuthForTesting({
      verifyIdToken: async () => ({ uid: "user_owner", email: "owner@example.com" } as any),
    } as any);

    const doc = await docsRepo.createDocument({
      owner: { type: "user", userId: "user_owner" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {},
      entitlement: { type: "pro", watermarked: false },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const docId = doc.id!;

    await storage.putArtifact({
      documentId: docId,
      version: 1,
      pdfBuffer: Buffer.from("pdf content"),
      filename: "test.pdf",
    });

    const req = new Request(`http://localhost:3000/api/documents/${docId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer valid_token" },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: docId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.purged).toBe(true);

    const updatedDoc = await docsRepo.getDocument(docId);
    expect(updatedDoc?.status).toBe("deleted");
    expect(updatedDoc?.deletedAt).toBeDefined();
    expect(updatedDoc?.pendingPurge).toBe(false);
  });

  it("handles storage purge failure gracefully by setting pendingPurge = true", async () => {
    setAdminAuthForTesting({
      verifyIdToken: async () => ({ uid: "user_owner", email: "owner@example.com" } as any),
    } as any);

    const doc = await docsRepo.createDocument({
      owner: { type: "user", userId: "user_owner" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {},
      entitlement: { type: "pro", watermarked: false },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const docId = doc.id!;

    // Mock storage failure
    storage.deleteDocumentArtifacts = async () => {
      throw new Error("R2 connection timeout");
    };

    const req = new Request(`http://localhost:3000/api/documents/${docId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer valid_token" },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: docId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.purged).toBe(false);

    const updatedDoc = await docsRepo.getDocument(docId);
    expect(updatedDoc?.status).toBe("deleted");
    expect(updatedDoc?.pendingPurge).toBe(true);
  });

  it("rejects deletion by non-owner with 403", async () => {
    setAdminAuthForTesting({
      verifyIdToken: async () => ({ uid: "other_user", email: "other@example.com" } as any),
    } as any);

    const doc = await docsRepo.createDocument({
      owner: { type: "user", userId: "user_owner" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {},
      entitlement: { type: "pro", watermarked: false },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const docId = doc.id!;

    const req = new Request(`http://localhost:3000/api/documents/${docId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer valid_token" },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: docId }) });
    expect(res.status).toBe(403);
  });
});
