import { describe, expect, it, beforeEach } from "bun:test";
import { POST as finalizePost } from "@/app/api/documents/finalize/route";
import { POST as downloadPost } from "@/app/api/access/download/route";
import {
  InMemoryDocumentsRepository,
  InMemoryOrdersRepository,
  InMemoryAccessRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryUsersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import { setArtifactStorageForTesting } from "@/lib/server/r2/storage";

describe("End-to-End Guest Purchase & Magic Link Flow", () => {
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

    setRepositoriesForTesting({
      documents: docsRepo,
      orders: ordersRepo,
      access: accessRepo,
      generationRequests: genRequestsRepo,
      users: usersRepo,
    });
    setArtifactStorageForTesting(storage);
  });

  const validGuestAnswers = {
    declarante_nome: "Maria Oliveira",
    declarante_cpf: "123.456.789-00",
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

  it("completes full guest purchase flow: paid order -> finalize -> permanent magic link -> download", async () => {
    // 1. Guest creates order
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "maria@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const requestId = crypto.randomUUID();

    // 2. Finalize document
    const finalizeReq = new Request("http://localhost:3000/api/documents/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        modeloSlug: "declaracao-residencia",
        respostas: validGuestAnswers,
        clausulasSelecionadas: [],
        guestContact: { email: "maria@example.com" },
        orderId: order.id,
      }),
    });

    const finalizeRes = await finalizePost(finalizeReq);
    const finalizeData = await finalizeRes.json();
    expect(finalizeRes.status).toBe(200);

    expect(finalizeData.document.id).toBeDefined();
    expect(finalizeData.document.guestAccessToken).toBeDefined();
    expect(finalizeData.document.guestAccessPath).toMatch(/^\/d\/.+/);

    const token = finalizeData.document.guestAccessToken;

    // 3. Download via access API with permanent token
    const downloadReq = new Request("http://localhost:3000/api/access/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const downloadRes = await downloadPost(downloadReq);
    expect(downloadRes.status).toBe(200);
    const downloadData = await downloadRes.json();
    expect(downloadData.downloadUrl).toBeDefined();
    expect(downloadData.filename).toBe("declaracao-residencia.pdf");

    // 4. Order must be marked consumed
    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("consumed");
    expect(updatedOrder?.documentId).toBe(finalizeData.document.id);
  });

  it("rejects guest finalization when guest contact is missing with 400", async () => {
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "maria@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const finalizeReq = new Request("http://localhost:3000/api/documents/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        modeloSlug: "declaracao-residencia",
        respostas: validGuestAnswers,
        clausulasSelecionadas: [],
        orderId: order.id,
        // no guestContact
      }),
    });

    const res = await finalizePost(finalizeReq);
    expect(res.status).toBe(400);
  });

  it("rejects guest finalization when orderId is missing with 402", async () => {
    const finalizeReq = new Request("http://localhost:3000/api/documents/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        modeloSlug: "declaracao-residencia",
        respostas: validGuestAnswers,
        clausulasSelecionadas: [],
        guestContact: { email: "guest@test.com" },
      }),
    });

    const res = await finalizePost(finalizeReq);
    expect(res.status).toBe(402);
  });

  it("rejects guest finalization when order is not paid with 402", async () => {
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "maria@example.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    const finalizeReq = new Request("http://localhost:3000/api/documents/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        modeloSlug: "declaracao-residencia",
        respostas: validGuestAnswers,
        clausulasSelecionadas: [],
        guestContact: { email: "maria@example.com" },
        orderId: order.id,
      }),
    });

    const res = await finalizePost(finalizeReq);
    expect(res.status).toBe(402);
  });
});
