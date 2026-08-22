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

describe("Watermark Enforcement Across Entitlements", () => {
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
    declarante_nome: "Juliana Silva",
    declarante_cpf: "111.444.777-35",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteira",
    declarante_profissao: "Advogada",
    declarante_cep: "01310-100",
    declarante_rua: "Av. Paulista",
    declarante_numero: "500",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante",
    cidade_data: "São Paulo, 14 de agosto de 2026",
  };

  const getDeps = () => ({
    repositories: {
      documents: docsRepo,
      orders: ordersRepo,
      access: accessRepo,
      generationRequests: genRequestsRepo,
      users: usersRepo,
    },
    storage,
  });

  it("free tier authenticated user gets watermarked artifact", async () => {
    const userId = "user_free_wm";
    const userEmail = "juliana_free@example.com";
    usersRepo.setUser(userId, {
      plano: "free",
      email: userEmail,
      nome: "Juliana Silva",
    });

    const res = await generateDocumentArtifact({
      requestId: crypto.randomUUID(),
      principal: { type: "user", userId, email: userEmail },
      modeloSlug: "declaracao-residencia",
      respostas: validAnswers,
      clausulasSelecionadas: [],
      deps: getDeps(),
    });

    const doc = await docsRepo.getDocument(res.documentId);
    expect(doc?.entitlement.watermarked).toBe(true);

    const artifact = await docsRepo.getArtifact(res.documentId, res.version);
    expect(artifact?.watermarked).toBe(true);
  });

  it("guest with paid single purchase order gets unwatermarked clean artifact", async () => {
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "juliana_guest@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const res = await generateDocumentArtifact({
      requestId: crypto.randomUUID(),
      principal: { type: "guest" },
      modeloSlug: "declaracao-residencia",
      respostas: validAnswers,
      clausulasSelecionadas: [],
      guestContact: { email: "juliana_guest@example.com" },
      orderId: order.id,
      deps: getDeps(),
    });

    const doc = await docsRepo.getDocument(res.documentId);
    expect(doc?.entitlement.watermarked).toBe(false);

    const artifact = await docsRepo.getArtifact(res.documentId, res.version);
    expect(artifact?.watermarked).toBe(false);
  });

  it("pro tier authenticated user gets unwatermarked clean artifact", async () => {
    const userId = "user_pro_clean";
    const userEmail = "juliana_pro@example.com";
    usersRepo.setUser(userId, {
      plano: "pro",
      email: userEmail,
      nome: "Juliana Pro",
    });

    const res = await generateDocumentArtifact({
      requestId: crypto.randomUUID(),
      principal: { type: "user", userId, email: userEmail },
      modeloSlug: "declaracao-residencia",
      respostas: validAnswers,
      clausulasSelecionadas: [],
      deps: getDeps(),
    });

    const doc = await docsRepo.getDocument(res.documentId);
    expect(doc?.entitlement.watermarked).toBe(false);

    const artifact = await docsRepo.getArtifact(res.documentId, res.version);
    expect(artifact?.watermarked).toBe(false);
  });
});
