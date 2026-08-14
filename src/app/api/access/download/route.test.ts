import { describe, expect, it } from "bun:test";
import { POST } from "./route";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { getArtifactStorage } from "@/lib/server/r2/storage";
import { generateAccessToken } from "@/lib/server/domain/documents";

describe("POST /api/access/download", () => {
  const repos = getRepositories();
  const storage = getArtifactStorage();

  it("returns download URL when a valid active access token is presented", async () => {
    const doc = await repos.documents.createDocument({
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

    await storage.putArtifact({
      documentId: doc.id!,
      version: 1,
      pdfBuffer: Buffer.from("%PDF-1.4 sample content"),
      filename: "declaracao-residencia.pdf",
    });

    await repos.documents.saveArtifact(doc.id!, {
      version: 1,
      objectKey: `documents/${doc.id}/v1/document.pdf`,
      sha256: "sha_sample",
      sizeBytes: 200,
      mimeType: "application/pdf",
      filename: "declaracao-residencia.pdf",
      watermarked: false,
      sourceHash: "src",
      modelSnapshotHash: "mod",
      generatedAt: Date.now(),
    });

    const { token, tokenHash } = generateAccessToken();

    await repos.access.createAccessLink({
      tokenHash,
      kind: "guest",
      documentId: doc.id!,
      version: 1,
      active: true,
      createdAt: Date.now(),
    });

    const req = new Request("http://localhost:3000/api/access/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.downloadUrl).toBeDefined();
    expect(data.filename).toBe("declaracao-residencia.pdf");
    expect(data.version).toBe(1);
    expect(data.kind).toBe("guest");
    expect(data.expiresIn).toBe(300);
  });

  it("returns 404 when access link has been revoked", async () => {
    const { token, tokenHash } = generateAccessToken();

    await repos.access.createAccessLink({
      tokenHash,
      kind: "share",
      documentId: "doc_revoked",
      version: 1,
      active: false, // revoked
      createdAt: Date.now(),
      revokedAt: Date.now(),
    });

    const req = new Request("http://localhost:3000/api/access/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error.code).toBe("ACCESS_LINK_INVALID");
  });
});
