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

    const doc = await docsRepo.getDocument(result.documentId);
    expect(doc?.currentVersion).toBe(1);
    expect(doc?.artifactState).toBe("ready");
    expect(doc?.owner).toEqual({
      type: "guest",
      contact: { email: "maria@example.com" },
    });

    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("consumed");
    expect(updatedOrder?.documentId).toBe(result.documentId);

    const artifact = await docsRepo.getArtifact(result.documentId, 1);
    expect(artifact?.version).toBe(1);
    expect(storage.hasObject(artifact!.objectKey)).toBe(true);

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
    expect((await docsRepo.listArtifacts(first.documentId)).length).toBe(1);
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

    const v1 = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655440003",
      principal: { type: "user", userId: "usr_pro" },
      modeloSlug: "declaracao-residencia",
      respostas: validGuestAnswers,
      deps,
    });

    expect(v1.version).toBe(1);
    expect(await docsRepo.getArtifact(v1.documentId, 1)).toBeDefined();

    const v2 = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655440004",
      principal: { type: "user", userId: "usr_pro" },
      modeloSlug: "declaracao-residencia",
      respostas: { ...validGuestAnswers, declarante_nome: "Maria Silva Souza" },
      existingDocumentId: v1.documentId,
      deps,
    });

    expect(v2.documentId).toBe(v1.documentId);
    expect(v2.version).toBe(2);
    const allArtifacts = await docsRepo.listArtifacts(v1.documentId);
    expect(allArtifacts.map((artifact) => artifact.version)).toEqual([1, 2]);
    const doc = await docsRepo.getDocument(v1.documentId);
    expect(doc?.currentVersion).toBe(2);
    expect(doc?.respostas.declarante_nome).toBe("Maria Silva Souza");
  });

  it("serializes concurrent Pro regenerations before they can both write version 2", async () => {
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

    const initial = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655440020",
      principal: { type: "user", userId: "usr_pro" },
      modeloSlug: "declaracao-residencia",
      respostas: validGuestAnswers,
      deps,
    });

    const attempts = await Promise.allSettled([
      generateDocumentArtifact({
        requestId: "550e8400-e29b-41d4-a716-446655440021",
        principal: { type: "user", userId: "usr_pro" },
        modeloSlug: "declaracao-residencia",
        respostas: { ...validGuestAnswers, declarante_nome: "Primeira" },
        existingDocumentId: initial.documentId,
        deps,
      }),
      generateDocumentArtifact({
        requestId: "550e8400-e29b-41d4-a716-446655440022",
        principal: { type: "user", userId: "usr_pro" },
        modeloSlug: "declaracao-residencia",
        respostas: { ...validGuestAnswers, declarante_nome: "Segunda" },
        existingDocumentId: initial.documentId,
        deps,
      }),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")[0]?.reason).toMatchObject({
      code: "GENERATION_IN_PROGRESS",
      status: 409,
    });
    expect((await docsRepo.listArtifacts(initial.documentId)).map((artifact) => artifact.version)).toEqual([1, 2]);
  });

  it("enforces the single free monthly slot atomically across concurrent finalizations", async () => {
    usersRepo.setUser("usr_free", { plano: "gratis" });
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
    const generateFreeDocument = (requestId: string, name: string) =>
      generateDocumentArtifact({
        requestId,
        principal: { type: "user", userId: "usr_free" },
        modeloSlug: "declaracao-residencia",
        respostas: { ...validGuestAnswers, declarante_nome: name },
        deps,
      });

    const attempts = await Promise.allSettled([
      generateFreeDocument("550e8400-e29b-41d4-a716-446655440032", "Primeira"),
      generateFreeDocument("550e8400-e29b-41d4-a716-446655440033", "Segunda"),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")[0]?.reason).toMatchObject({
      code: "FREE_LIMIT_REACHED",
      status: 402,
    });
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
      buyer: { type: "guest", email: "guest@example.com" },
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

    const checkOrder = await ordersRepo.getOrder(order.id!);
    expect(checkOrder?.status).toBe("paid");
  });
});
