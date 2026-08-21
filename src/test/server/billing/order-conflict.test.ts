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
import { BackendError } from "@/lib/server/errors";

describe("Order Double Spending and Concurrent Conflict Tests", () => {
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
    declarante_nome: "Carlos Eduardo",
    declarante_cpf: "123.456.789-00",
    declarante_nacionalidade: "Brasileiro",
    declarante_estado_civil: "Solteiro",
    declarante_profissao: "Engenheiro",
    declarante_cep: "01310-100",
    declarante_rua: "Av. Paulista",
    declarante_numero: "1000",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante",
    cidade_data: "São Paulo, 14 de agosto de 2026",
  };

  it("prevents double spending: two concurrent requests with the same orderId must allow only one to succeed", async () => {
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "carlos@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

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

    const req1 = generateDocumentArtifact({
      requestId: crypto.randomUUID(),
      principal: { type: "guest" },
      modeloSlug: "declaracao-residencia",
      respostas: validAnswers,
      clausulasSelecionadas: [],
      guestContact: { email: "carlos@example.com" },
      orderId: order.id,
      deps,
    });

    const req2 = generateDocumentArtifact({
      requestId: crypto.randomUUID(),
      principal: { type: "guest" },
      modeloSlug: "declaracao-residencia",
      respostas: validAnswers,
      clausulasSelecionadas: [],
      guestContact: { email: "carlos@example.com" },
      orderId: order.id,
      deps,
    });

    const results = await Promise.allSettled([req1, req2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const error = (rejected[0] as PromiseRejectedResult).reason;
    expect(error).toBeInstanceOf(BackendError);
    expect(["ORDER_ALREADY_RESERVED", "ORDER_ALREADY_CONSUMED"]).toContain(error.code);
    expect(error.status).toBe(409);
  });
});
