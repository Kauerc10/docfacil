import { describe, expect, it, beforeEach } from "bun:test";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import { InMemoryDocumentStore } from "@/lib/server/firestore/in-memory-document-store";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";

describe("Atomic Generation Commit & Rollback", () => {
  let store: InMemoryDocumentStore;
  let storage: InMemoryArtifactStorage;

  beforeEach(() => {
    store = new InMemoryDocumentStore();
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
    store.failNextCommit(new Error("transaction aborted by Firestore"));

    let deleteArtifactCalledWithKey: string | null = null;
    const originalDeleteArtifact = storage.deleteArtifact.bind(storage);
    storage.deleteArtifact = async (key: string) => {
      deleteArtifactCalledWithKey = key;
      return originalDeleteArtifact(key);
    };

    const order = await store.createOrder({
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
          store,
          storage,
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(deleteArtifactCalledWithKey).toBeDefined();

    const updatedOrder = await store.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("paid");

    const genReq = await store.getGenerationRequest(requestId);
    expect(genReq?.status).toBe("failed");

    expect(store.access.size()).toBe(0);
  });

  it("never deletes R2 artifact after Firestore commit succeeds", async () => {
    let deleteArtifactCalled = false;
    storage.deleteArtifact = async (key: string) => {
      deleteArtifactCalled = true;
    };

    const order = await store.createOrder({
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
        store,
        storage,
      },
    });

    expect(result.artifactState).toBe("ready");
    expect(deleteArtifactCalled).toBe(false);

    const updatedOrder = await store.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("consumed");

    const genReq = await store.getGenerationRequest(requestId);
    expect(genReq?.status).toBe("completed");

    expect(store.access.size()).toBe(1);
  });
});
