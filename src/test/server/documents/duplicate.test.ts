import { describe, expect, it, beforeEach } from "bun:test";
import { POST as duplicateRoute } from "@/app/api/documents/[id]/duplicate/route";
import { setAdminAuthForTesting, setAdminAppCheckForTesting } from "@/lib/server/firebase-admin";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import { InMemoryDocumentsRepository } from "@/lib/server/firestore/in-memory-repositories";

describe("POST /api/documents/:id/duplicate", () => {
  let docsRepo: InMemoryDocumentsRepository;

  beforeEach(() => {
    docsRepo = new InMemoryDocumentsRepository();
    setRepositoriesForTesting({ documents: docsRepo });

    setAdminAppCheckForTesting({
      verifyToken: async () => ({ appId: "test-app", token: {} as any }),
    } as any);

    setAdminAuthForTesting({
      verifyIdToken: async (token: string) => {
        if (token === "valid_user_token") {
          return { uid: "user_123", email: "user@example.com" } as any;
        }
        if (token === "other_user_token") {
          return { uid: "other_user", email: "other@example.com" } as any;
        }
        throw new Error("Invalid token");
      },
    } as any);
  });

  it("returns duplicate draft responses for the owner without creating a document in Firestore", async () => {
    const original = await docsRepo.createDocument({
      owner: { type: "user", userId: "user_123" },
      modeloSlug: "contrato-locacao",
      modeloNome: "Contrato de Locação",
      respostas: { locador: "Ana", locatario: "Carlos" },
      entitlement: { type: "free", watermarked: true },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const req = new Request(`http://localhost/api/documents/${original.id}/duplicate`, {
      method: "POST",
      headers: {
        Authorization: "Bearer valid_user_token",
        "X-Firebase-AppCheck": "valid_token",
      },
    });

    const res = await duplicateRoute(req, { params: Promise.resolve({ id: original.id! }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.duplicateDraft.modeloSlug).toBe("contrato-locacao");
    expect(body.duplicateDraft.respostas.locador).toBe("Ana");

    // Must not have added a new document to repository
    const userDocs = await docsRepo.listUserDocuments("user_123");
    expect(userDocs.length).toBe(1);
  });

  it("rejects duplicate request from non-owner with 403", async () => {
    const original = await docsRepo.createDocument({
      owner: { type: "user", userId: "user_123" },
      modeloSlug: "contrato-locacao",
      modeloNome: "Contrato de Locação",
      respostas: { locador: "Ana" },
      entitlement: { type: "free", watermarked: true },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const req = new Request(`http://localhost/api/documents/${original.id}/duplicate`, {
      method: "POST",
      headers: {
        Authorization: "Bearer other_user_token",
        "X-Firebase-AppCheck": "valid_token",
      },
    });

    const res = await duplicateRoute(req, { params: Promise.resolve({ id: original.id! }) });
    expect(res.status).toBe(403);
  });
});
