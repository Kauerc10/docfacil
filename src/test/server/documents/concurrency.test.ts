import { describe, expect, it, beforeEach } from "bun:test";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import {
  InMemoryDocumentsRepository,
  InMemoryOrdersRepository,
  InMemoryAccessRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryUsersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";

describe("Idempotency and Concurrency of Generation Requests", () => {
  let docsRepo: InMemoryDocumentsRepository;
  let ordersRepo: InMemoryOrdersRepository;
  let accessRepo: InMemoryAccessRepository;
  let genRequestsRepo: InMemoryGenerationRequestsRepository;
  let usersRepo: InMemoryUsersRepository;
  let storage: InMemoryArtifactStorage;

  beforeEach(() => {
    docsRepo = new InMemoryDocumentsRepository();
    ordersRepo = new InMemoryOrdersRepository();
    accessRepo = new InMemoryAccessRepository();
    genRequestsRepo = new InMemoryGenerationRequestsRepository();
    usersRepo = new InMemoryUsersRepository();
    storage = new InMemoryArtifactStorage();
  });

  const validAnswers = {
    declarante_nome: "Ana Beatriz",
    declarante_cpf: "111.444.777-35",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteira",
    declarante_profissao: "Arquiteta",
    declarante_cep: "01310-100",
    declarante_rua: "Av. Paulista",
    declarante_numero: "2000",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante",
    cidade_data: "São Paulo, 14 de agosto de 2026",
  };

  it("same requestId executed concurrently or sequentially returns identical document without duplicate creation", async () => {
    const userId = "user_concurrency_1";
    const userEmail = "ana@example.com";
    usersRepo.setUser(userId, {
      plano: "pro",
      email: userEmail,
      nome: "Ana Beatriz",
    });

    const requestId = crypto.randomUUID();
    const deps = {
      repositories: {
        documents: docsRepo,
        orders: ordersRepo,
        access: accessRepo,
        generationRequests: genRequestsRepo,
        users: usersRepo,
      },
      storage,
    };

    const res1 = await generateDocumentArtifact({
      requestId,
      principal: { type: "user", userId, email: userEmail },
      modeloSlug: "declaracao-residencia",
      respostas: validAnswers,
      clausulasSelecionadas: [],
      deps,
    });

    const res2 = await generateDocumentArtifact({
      requestId,
      principal: { type: "user", userId, email: userEmail },
      modeloSlug: "declaracao-residencia",
      respostas: validAnswers,
      clausulasSelecionadas: [],
      deps,
    });

    expect(res1.documentId).toBe(res2.documentId);
    expect(res1.version).toBe(res2.version);

    const userDocs = await docsRepo.listUserDocuments(userId);
    expect(userDocs.length).toBe(1);
  });
});
