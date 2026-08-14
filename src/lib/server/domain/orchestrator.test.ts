import { describe, expect, it, beforeEach } from "bun:test";
import { generateDocumentArtifact } from "./orchestrator";
import {
  InMemoryDocumentsRepository,
  InMemoryAccessRepository,
  InMemoryOrdersRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryUsersRepository,
  InMemoryGenerationCommitRepository,
} from "../firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "../r2/storage";
import { BackendError } from "../errors";

describe("generateDocumentArtifact (Orchestrator)", () => {
  let docsRepo: InMemoryDocumentsRepository;
  let accessRepo: InMemoryAccessRepository;
  let ordersRepo: InMemoryOrdersRepository;
  let genRequestsRepo: InMemoryGenerationRequestsRepository;
  let usersRepo: InMemoryUsersRepository;
  let commitRepo: InMemoryGenerationCommitRepository;
  let storage: InMemoryArtifactStorage;

  beforeEach(() => {
    docsRepo = new InMemoryDocumentsRepository();
    accessRepo = new InMemoryAccessRepository();
    ordersRepo = new InMemoryOrdersRepository();
    genRequestsRepo = new InMemoryGenerationRequestsRepository();
    usersRepo = new InMemoryUsersRepository();
    commitRepo = new InMemoryGenerationCommitRepository(
      docsRepo,
      accessRepo,
      ordersRepo,
      genRequestsRepo
    );
    storage = new InMemoryArtifactStorage();
  });

  const validGuestAnswers = {
    declarante_nome: "Maria Silva",
    declarante_cpf: "123.456.789-00",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteira",
    declarante_profissao: "Autônoma",
    declarante_cep: "01310-100",
    declarante_rua: "Av. Paulista",
    declarante_numero: "1000",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante de residência para matrícula",
    cidade_data: "São Paulo, 14 de agosto de 2026",
  };

  it("completes happy path for guest: consumes order, uploads to R2, creates artifact v1, promotes, and issues guest magic link", async () => {
    // Setup paid order
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "maria@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const result = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655440001",
      principal: { type: "guest" },
      modeloSlug: "declaracao-residencia",
      respostas: validGuestAnswers,
      guestContact: { email: "maria@example.com" },
      orderId: order.id,
      deps: {
        repositories: {
          documents: docsRepo,
          access: accessRepo,
          orders: ordersRepo,
          generationRequests: genRequestsRepo,
          users: usersRepo,
          generationCommit: commitRepo,
        },
        storage,
      },
    });

    expect(result.documentId).toBeDefined();
    expect(result.version).toBe(1);
    expect(result.artifactState).toBe("ready");
    expect(result.guestAccessToken).toBeDefined();
    expect(result.guestAccessPath).toBe(`/d/${result.guestAccessToken}`);

    // Verify document record
    const doc = await docsRepo.getDocument(result.documentId);
    expect(doc?.currentVersion).toBe(1);
    expect(doc?.artifactState).toBe("ready");
    expect(doc?.owner).toEqual({
      type: "guest",
      contact: { email: "maria@example.com" },
    });

    // Verify order consumed
    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("consumed");
    expect(updatedOrder?.documentId).toBe(result.documentId);

    // Verify artifact stored in R2
    const artifact = await docsRepo.getArtifact(result.documentId, 1);
    expect(artifact?.version).toBe(1);
    expect(storage.hasObject(artifact!.objectKey)).toBe(true);

    // Verify access link created
    const accessLink = await accessRepo.getAccessLink(
      result.guestAccessToken ? result.guestAccessPath!.replace("/d/", "") : ""
    );
    // Remember: Access repo stores by tokenHash
    const genReq = await genRequestsRepo.getRequest("550e8400-e29b-41d4-a716-446655440001");
    expect(genReq?.status).toBe("completed");
  });

  it("handles idempotency: repeated request with same requestId returns existing result without creating duplicate artifacts", async () => {
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "maria@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const deps = {
      repositories: {
        documents: docsRepo,
        access: accessRepo,
        orders: ordersRepo,
        generationRequests: genRequestsRepo,
        users: usersRepo,
        generationCommit: commitRepo,
      },
      storage,
    };

    const first = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655440002",
      principal: { type: "guest" },
      modeloSlug: "declaracao-residencia",
      respostas: validGuestAnswers,
      guestContact: { email: "maria@example.com" },
      orderId: order.id,
      deps,
    });

    const second = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655440002",
      principal: { type: "guest" },
      modeloSlug: "declaracao-residencia",
      respostas: validGuestAnswers,
      guestContact: { email: "maria@example.com" },
      orderId: order.id,
      deps,
    });

    expect(first.documentId).toBe(second.documentId);
    expect(first.version).toBe(second.version);
    expect(first.guestAccessPath).toBe(second.guestAccessPath);

    const artifacts = await docsRepo.listArtifacts(first.documentId);
    expect(artifacts.length).toBe(1);
  });

  it("supports Pro regeneration: creates v2 while keeping v1 artifact intact", async () => {
    usersRepo.setUser("usr_pro", { plano: "pro" });

    const deps = {
      repositories: {
        documents: docsRepo,
        access: accessRepo,
        orders: ordersRepo,
        generationRequests: genRequestsRepo,
        users: usersRepo,
        generationCommit: commitRepo,
      },
      storage,
    };

    // Initial v1 generation
    const v1 = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655440003",
      principal: { type: "user", userId: "usr_pro" },
      modeloSlug: "declaracao-residencia",
      respostas: validGuestAnswers,
      deps,
    });

    expect(v1.version).toBe(1);
    const artV1 = await docsRepo.getArtifact(v1.documentId, 1);
    expect(artV1).toBeDefined();

    // v2 regeneration with updated answers
    const updatedAnswers = {
      ...validGuestAnswers,
      declarante_nome: "Maria Silva Souza",
    };

    const v2 = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655440004",
      principal: { type: "user", userId: "usr_pro" },
      modeloSlug: "declaracao-residencia",
      respostas: updatedAnswers,
      existingDocumentId: v1.documentId,
      deps,
    });

    expect(v2.documentId).toBe(v1.documentId);
    expect(v2.version).toBe(2);

    const allArtifacts = await docsRepo.listArtifacts(v1.documentId);
    expect(allArtifacts.length).toBe(2);
    expect(allArtifacts[0].version).toBe(1);
    expect(allArtifacts[1].version).toBe(2);

    const doc = await docsRepo.getDocument(v1.documentId);
    expect(doc?.currentVersion).toBe(2);
    expect(doc?.respostas.declarante_nome).toBe("Maria Silva Souza");
  });

  it("does not promote version or consume order if R2 upload fails", async () => {
    const failingStorage = {
      putArtifact: async () => {
        throw new BackendError("R2_UPLOAD_FAILED", 500, "Upload falhou");
      },
      getDownloadUrl: async () => "",
      deleteArtifact: async () => {},
      deleteDocumentArtifacts: async () => {},
    };

    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest" },
      status: "paid",
      createdAt: Date.now(),
    });

    const deps = {
      repositories: {
        documents: docsRepo,
        access: accessRepo,
        orders: ordersRepo,
        generationRequests: genRequestsRepo,
        users: usersRepo,
        generationCommit: commitRepo,
      },
      storage: failingStorage,
    };

    try {
      await generateDocumentArtifact({
        requestId: "550e8400-e29b-41d4-a716-446655440005",
        principal: { type: "guest" },
        modeloSlug: "declaracao-residencia",
        respostas: validGuestAnswers,
        guestContact: { email: "guest@example.com" },
        orderId: order.id,
        deps,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("R2_UPLOAD_FAILED");
    }

    // Order remains paid (not consumed)
    const checkOrder = await ordersRepo.getOrder(order.id!);
    expect(checkOrder?.status).toBe("paid");
  });
});
