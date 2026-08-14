import { describe, expect, it, beforeEach } from "bun:test";
import { POST } from "@/app/api/documents/[id]/duplicate/route";
import {
  InMemoryDocumentsRepository,
  InMemoryOrdersRepository,
  InMemoryAccessRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryUsersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import { setAdminAuthForTesting } from "@/lib/server/firebase-admin";

describe("Document Duplication Flow & Draft Restoration", () => {
  let docsRepo: InMemoryDocumentsRepository;
  let ordersRepo: InMemoryOrdersRepository;
  let accessRepo: InMemoryAccessRepository;
  let genRequestsRepo: InMemoryGenerationRequestsRepository;
  let usersRepo: InMemoryUsersRepository;

  beforeEach(() => {
    docsRepo = new InMemoryDocumentsRepository();
    ordersRepo = new InMemoryOrdersRepository();
    accessRepo = new InMemoryAccessRepository();
    genRequestsRepo = new InMemoryGenerationRequestsRepository();
    usersRepo = new InMemoryUsersRepository();

    setRepositoriesForTesting({
      documents: docsRepo,
      orders: ordersRepo,
      access: accessRepo,
      generationRequests: genRequestsRepo,
      users: usersRepo,
    });

    setAdminAuthForTesting({
      verifyIdToken: async (token: string) => {
        if (token === "alice-token") {
          return { uid: "alice", email: "alice@example.com" } as any;
        }
        if (token === "bob-token") {
          return { uid: "bob", email: "bob@example.com" } as any;
        }
        throw new Error("Invalid token");
      },
    } as any);
  });

  it("allows owner to duplicate document and receive clean draft without creating a new Firestore doc", async () => {
    const doc = await docsRepo.createDocument({
      owner: { type: "user", userId: "alice" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {
        declarante_nome: "Alice Santos",
        declarante_cpf: "111.222.333-44",
        finalidade: "Abertura de conta bancária",
      },
      entitlement: { type: "free", watermarked: true },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const initialDocsCount = (await docsRepo.listUserDocuments("alice")).length;
    expect(initialDocsCount).toBe(1);

    const req = new Request(`http://localhost:3000/api/documents/${doc.id}/duplicate`, {
      method: "POST",
      headers: { Authorization: "Bearer alice-token" },
    });

    const res = await POST(req, { params: Promise.resolve({ id: doc.id! }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.duplicateDraft.modeloSlug).toBe("declaracao-residencia");
    expect(data.duplicateDraft.respostas.declarante_nome).toBe("Alice Santos");
    expect(data.duplicateDraft.respostas.finalidade).toBe("Abertura de conta bancária");

    // Must NOT create a document in Firestore during duplicate
    const finalDocsCount = (await docsRepo.listUserDocuments("alice")).length;
    expect(finalDocsCount).toBe(1);
  });

  it("rejects duplicate request from non-owner with 403", async () => {
    const doc = await docsRepo.createDocument({
      owner: { type: "user", userId: "alice" },
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

    const req = new Request(`http://localhost:3000/api/documents/${doc.id}/duplicate`, {
      method: "POST",
      headers: { Authorization: "Bearer bob-token" },
    });

    const res = await POST(req, { params: Promise.resolve({ id: doc.id! }) });
    expect(res.status).toBe(403);
  });
});
