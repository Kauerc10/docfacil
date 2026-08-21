import { describe, expect, it } from "bun:test";
import {
  FINALIZATION_INTENT_TTL_MS,
  getOrCreateFinalizationRequestId,
  clearFinalizationRequestId,
} from "@/lib/documents/idempotency";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import { InMemoryDocumentsRepository, InMemoryGenerationRequestsRepository, InMemoryOrdersRepository, InMemoryUsersRepository } from "@/lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";

describe("Document Idempotency Management", () => {
  it("reuses finalization requestId on retries for the same model", () => {
    clearFinalizationRequestId("contrato-locacao");
    const req1 = getOrCreateFinalizationRequestId("contrato-locacao");
    const req2 = getOrCreateFinalizationRequestId("contrato-locacao");

    expect(req1).toBe(req2);

    clearFinalizationRequestId("contrato-locacao");
    const req3 = getOrCreateFinalizationRequestId("contrato-locacao");
    expect(req3).not.toBe(req1);
  });

  it("rotates an abandoned finalization request after the client retry window", () => {
    const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const store = new Map<string, string>();
    const fakeLocalStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() { return store.size; },
    } as Storage;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: fakeLocalStorage,
    });

    const slug = "declaracao-residencia";
    const key = `docfacil:intent:v1:${slug}`;
    const staleRequestId = "00000000-0000-0000-0000-000000000099";

    try {
      clearFinalizationRequestId(slug);
      localStorage.setItem(key, JSON.stringify({
        requestId: staleRequestId,
        modeloSlug: slug,
        createdAt: Date.now() - FINALIZATION_INTENT_TTL_MS - 1000,
      }));

      const freshRequestId = getOrCreateFinalizationRequestId(slug);
      expect(freshRequestId).not.toBe(staleRequestId);
      expect(getOrCreateFinalizationRequestId(slug)).toBe(freshRequestId);
    } finally {
      clearFinalizationRequestId(slug);
      if (previousLocalStorage) {
        Object.defineProperty(globalThis, "localStorage", previousLocalStorage);
      } else {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      }
    }
  });

  const validAnswers = {
    declarante_nome: "Carlos Eduardo Lima",
    declarante_cpf: "111.444.777-35",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteiro",
    declarante_profissao: "Engenheiro",
    declarante_cep: "01310-100",
    declarante_rua: "Av. Paulista",
    declarante_numero: "1000",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante para fins bancários",
    cidade_data: "São Paulo, 14 de agosto de 2026",
  };

  it("orchestrator returns existing completed result on repeated requestId", async () => {
    const docsRepo = new InMemoryDocumentsRepository();
    const genRequestsRepo = new InMemoryGenerationRequestsRepository();
    const ordersRepo = new InMemoryOrdersRepository();
    const usersRepo = new InMemoryUsersRepository();
    const storage = new InMemoryArtifactStorage();

    const deps = {
      repositories: {
        documents: docsRepo,
        generationRequests: genRequestsRepo,
        orders: ordersRepo,
        access: {} as any,
        users: usersRepo,
      },
      storage,
    };

    const requestId = "00000000-0000-0000-0000-000000000001";
    const input = {
      requestId,
      principal: { type: "user", userId: "user_pro", email: "pro@example.com" } as const,
      modeloSlug: "declaracao-residencia",
      respostas: validAnswers,
      clausulasSelecionadas: [],
      deps,
    };

    await usersRepo.setUserProfile("user_pro", { plano: "pro" });

    const result1 = await generateDocumentArtifact(input);
    expect(result1.documentId).toBeDefined();
    expect(result1.version).toBe(1);

    const result2 = await generateDocumentArtifact(input);
    expect(result2.documentId).toBe(result1.documentId);
    expect(result2.version).toBe(1);

    const artifacts = await docsRepo.listArtifacts(result1.documentId);
    expect(artifacts.length).toBe(1);
  });

  it("orchestrator sets correct targetVersion 2 for pro regeneration", async () => {
    const docsRepo = new InMemoryDocumentsRepository();
    const genRequestsRepo = new InMemoryGenerationRequestsRepository();
    const ordersRepo = new InMemoryOrdersRepository();
    const usersRepo = new InMemoryUsersRepository();
    const storage = new InMemoryArtifactStorage();

    const deps = {
      repositories: {
        documents: docsRepo,
        generationRequests: genRequestsRepo,
        orders: ordersRepo,
        access: {} as any,
        users: usersRepo,
      },
      storage,
    };

    await usersRepo.setUserProfile("user_pro", { plano: "pro" });

    const doc = await docsRepo.createDocument({
      owner: { type: "user", userId: "user_pro" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: validAnswers,
      entitlement: { type: "pro", watermarked: false },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });

    const result = await generateDocumentArtifact({
      requestId: "00000000-0000-0000-0000-000000000002",
      principal: { type: "user", userId: "user_pro", email: "pro@example.com" },
      modeloSlug: "declaracao-residencia",
      respostas: { ...validAnswers, declarante_profissao: "Arquiteto" },
      clausulasSelecionadas: [],
      existingDocumentId: doc.id,
      deps,
    });

    expect(result.version).toBe(2);

    const genReq = await genRequestsRepo.getRequest("00000000-0000-0000-0000-000000000002");
    expect(genReq?.targetVersion).toBe(2);
    expect(genReq?.operation).toBe("pro_regeneration");
  });
});
