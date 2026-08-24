import { describe, expect, it, beforeEach } from "bun:test";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import {
  InMemoryDocumentsRepository,
  InMemoryOrdersRepository,
  InMemoryAccessRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryUsersRepository,
  InMemoryGenerationCommitRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";

describe("Atomic Generation Commit & Rollback", () => {
  let docsRepo: InMemoryDocumentsRepository;
  let ordersRepo: InMemoryOrdersRepository;
  let accessRepo: InMemoryAccessRepository;
  let genRequestsRepo: InMemoryGenerationRequestsRepository;
  let usersRepo: InMemoryUsersRepository;
  let commitRepo: InMemoryGenerationCommitRepository;
  let storage: InMemoryArtifactStorage;

  beforeEach(() => {
    docsRepo = new InMemoryDocumentsRepository();
    ordersRepo = new InMemoryOrdersRepository();
    accessRepo = new InMemoryAccessRepository();
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

  const validAnswers = {
    declarante_nome: "Maria Oliveira",
    declarante_cpf: "111.444.777-35",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteira",
    declarante_profissao: "Desenvolvedora",
    declarante_cep: "01310-100",
    declarante_rua: "Av. Paulista",
    declarante_numero: "1500",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante de residência",
    cidade_data: "São Paulo, 14 de agosto de 2026",
  };

  it("compensates R2, releases order and leaves no partial Firestore state when commit fails", async () => {
    commitRepo.failNextCommit(new Error("transaction aborted by Firestore"));

    let deleteArtifactCalledWithKey: string | null = null;
    const originalDeleteArtifact = storage.deleteArtifact.bind(storage);
    storage.deleteArtifact = async (key: string) => {
      deleteArtifactCalledWithKey = key;
      return originalDeleteArtifact(key);
    };

    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "maria@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const requestId = crypto.randomUUID();

    let thrownError: any = null;
    try {
      await generateDocumentArtifact({
        requestId,
        principal: { type: "guest" },
        modeloSlug: "declaracao-residencia",
        respostas: validAnswers,
        clausulasSelecionadas: [],
        guestContact: { email: "maria@example.com" },
        orderId: order.id,
        deps: {
          repositories: {
            documents: docsRepo,
            orders: ordersRepo,
            access: accessRepo,
            generationRequests: genRequestsRepo,
            users: usersRepo,
            generationCommit: commitRepo,
          },
          storage,
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(deleteArtifactCalledWithKey).toBeDefined();

    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("paid");

    const genReq = await genRequestsRepo.getRequest(requestId);
    expect(genReq?.status).toBe("failed");

    expect(accessRepo.size()).toBe(0);
  });

  it("never deletes R2 artifact after Firestore commit succeeds", async () => {
    let deleteArtifactCalled = false;
    storage.deleteArtifact = async (key: string) => {
      deleteArtifactCalled = true;
    };

    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "maria@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const requestId = crypto.randomUUID();

    const result = await generateDocumentArtifact({
      requestId,
      principal: { type: "guest" },
      modeloSlug: "declaracao-residencia",
      respostas: validAnswers,
      clausulasSelecionadas: [],
      guestContact: { email: "maria@example.com" },
      orderId: order.id,
      deps: {
        repositories: {
          documents: docsRepo,
          orders: ordersRepo,
          access: accessRepo,
          generationRequests: genRequestsRepo,
          users: usersRepo,
          generationCommit: commitRepo,
        },
        storage,
      },
    });

    expect(result.artifactState).toBe("ready");
    expect(deleteArtifactCalled).toBe(false);

    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("consumed");

    const genReq = await genRequestsRepo.getRequest(requestId);
    expect(genReq?.status).toBe("completed");

    expect(accessRepo.size()).toBe(1);
  });
});
