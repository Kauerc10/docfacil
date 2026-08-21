import { describe, expect, it, beforeEach } from "bun:test";
import { GET, DELETE } from "./route";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { getArtifactStorage } from "@/lib/server/r2/storage";
import { setAdminAuthForTesting } from "@/lib/server/firebase-admin";

describe("/api/documents/[id] routes (GET, DELETE)", () => {
  const repos = getRepositories();
  const storage = getArtifactStorage();

  beforeEach(() => {
    setAdminAuthForTesting(null);
  });

  it("GET returns document details and artifact history for owner", async () => {
    const doc = await repos.documents.createDocument({
      owner: { type: "user", userId: "usr_doc_owner" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: { declarante_nome: "Ana" },
      entitlement: { type: "pro", watermarked: false },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await repos.documents.saveArtifact(doc.id!, {
      version: 1,
      objectKey: `documents/${doc.id}/v1/document.pdf`,
      sha256: "sha_ana",
      sizeBytes: 123,
      mimeType: "application/pdf",
      filename: "declaracao.pdf",
      watermarked: false,
      sourceHash: "src",
      modelSnapshotHash: "mod",
      generatedAt: Date.now(),
    });

    setAdminAuthForTesting({
      verifyIdToken: async () => ({ uid: "usr_doc_owner" } as any),
    } as any);

    const req = new Request(`http://localhost:3000/api/documents/${doc.id}`, {
      method: "GET",
      headers: { Authorization: "Bearer token" },
    });

    const res = await GET(req, {
      params: Promise.resolve({ id: doc.id! }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.document.id).toBe(doc.id);
    expect(data.document.artifacts.length).toBe(1);
    expect(data.document.artifacts[0].version).toBe(1);
  });

  it("DELETE coordinates revocation of shares, deletion of R2 artifacts and deletion of document metadata", async () => {
    const doc = await repos.documents.createDocument({
      owner: { type: "user", userId: "usr_to_delete" },
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

    await storage.putArtifact({
      documentId: doc.id!,
      version: 1,
      pdfBuffer: Buffer.from("%PDF-1.4 sample"),
      filename: "declaracao.pdf",
    });

    await repos.access.createAccessLink({
      tokenHash: "share_hash_to_delete",
      kind: "share",
      documentId: doc.id!,
      version: 1,
      active: true,
      createdAt: Date.now(),
    });

    setAdminAuthForTesting({
      verifyIdToken: async () => ({ uid: "usr_to_delete" } as any),
    } as any);

    const req = new Request(`http://localhost:3000/api/documents/${doc.id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token" },
    });

    const res = await DELETE(req, {
      params: Promise.resolve({ id: doc.id! }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify document marked as deleted in repository
    const checkDoc = await repos.documents.getDocument(doc.id!);
    expect(checkDoc?.status).toBe("deleted");
    expect(checkDoc?.pendingPurge).toBe(false);

    // Verify share link revoked
    const checkShare = await repos.access.getAccessLink("share_hash_to_delete");
    expect(checkShare?.active).toBe(false);

    // Verify R2 object removed
    expect((storage as any).hasObject(`documents/${doc.id}/v1/document.pdf`)).toBe(false);
  });
});
