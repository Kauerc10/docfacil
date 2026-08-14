import { describe, expect, it, beforeEach } from "bun:test";
import { POST } from "./route";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { getArtifactStorage } from "@/lib/server/r2/storage";
import { setAdminAuthForTesting } from "@/lib/server/firebase-admin";

describe("POST /api/documents/[id]/download", () => {
  const repos = getRepositories();
  const storage = getArtifactStorage();

  beforeEach(() => {
    setAdminAuthForTesting(null);
  });

  it("returns signed download url for owner of document", async () => {
    // Create doc
    const doc = await repos.documents.createDocument({
      owner: { type: "user", userId: "usr_downloader" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {},
      entitlement: { type: "free", watermarked: true },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Save artifact in storage & db
    await storage.putArtifact({
      documentId: doc.id!,
      version: 1,
      pdfBuffer: Buffer.from("%PDF-1.4 mock pdf"),
      filename: "declaracao.pdf",
    });

    await repos.documents.saveArtifact(doc.id!, {
      version: 1,
      objectKey: `documents/${doc.id}/v1/document.pdf`,
      sha256: "sha_test",
      sizeBytes: 100,
      mimeType: "application/pdf",
      filename: "declaracao.pdf",
      watermarked: true,
      sourceHash: "src",
      modelSnapshotHash: "mod",
      generatedAt: Date.now(),
    });

    setAdminAuthForTesting({
      verifyIdToken: async (token: string) => {
        if (token === "valid-user-token") {
          return { uid: "usr_downloader", email: "usr@example.com" } as any;
        }
        throw new Error("Invalid token");
      },
    } as any);

    const req = new Request(`http://localhost:3000/api/documents/${doc.id}/download`, {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-user-token",
      },
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: doc.id! }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.downloadUrl).toBeDefined();
    expect(data.filename).toBe("declaracao.pdf");
    expect(data.version).toBe(1);
    expect(data.expiresIn).toBe(300);
  });

  it("returns 403 when user is not the owner of document", async () => {
    const doc = await repos.documents.createDocument({
      owner: { type: "user", userId: "usr_other" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {},
      entitlement: { type: "free", watermarked: true },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    setAdminAuthForTesting({
      verifyIdToken: async () => ({ uid: "usr_intruder" } as any),
    } as any);

    const req = new Request(`http://localhost:3000/api/documents/${doc.id}/download`, {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
      },
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: doc.id! }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe("DOCUMENT_FORBIDDEN");
  });
});
