import { describe, expect, it } from "bun:test";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import {
  InMemoryAccessRepository,
  InMemoryBillingSubscriptionsRepository,
  InMemoryDocumentsRepository,
  InMemoryGenerationCommitRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryOrdersRepository,
  InMemoryUsersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";

const validAnswers = {
  declarante_nome: "Maria Silva",
  declarante_cpf: "111.444.777-35",
  declarante_nacionalidade: "Brasileira",
  declarante_estado_civil: "Solteira",
  declarante_profissao: "Autônoma",
  declarante_cep: "01310-100",
  declarante_rua: "Av. Paulista",
  declarante_numero: "1000",
  declarante_bairro: "Bela Vista",
  declarante_cidade: "São Paulo",
  declarante_uf: "SP",
  finalidade: "Comprovante de residência",
  cidade_data: "São Paulo, 24 de agosto de 2026",
};

function setup() {
  const documents = new InMemoryDocumentsRepository();
  const access = new InMemoryAccessRepository();
  const orders = new InMemoryOrdersRepository();
  const generationRequests = new InMemoryGenerationRequestsRepository();
  const users = new InMemoryUsersRepository();
  const subscriptions = new InMemoryBillingSubscriptionsRepository();
  const generationCommit = new InMemoryGenerationCommitRepository(
    documents,
    access,
    orders,
    generationRequests
  );
  const storage = new InMemoryArtifactStorage();

  return {
    documents,
    users,
    subscriptions,
    deps: {
      repositories: {
        documents,
        access,
        orders,
        generationRequests,
        users,
        generationCommit,
      },
      billingSubscriptions: subscriptions,
      storage,
    },
  };
}

async function createExistingDocument(
  documents: InMemoryDocumentsRepository,
  userId: string
) {
  return documents.createDocument({
    owner: { type: "user", userId },
    modeloSlug: "declaracao-residencia",
    modeloNome: "Declaração de Residência",
    respostas: validAnswers,
    entitlement: { type: "pro", watermarked: false },
    artifactState: "ready",
    currentVersion: 1,
    targetVersion: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

describe("autoridade Pro no orquestrador", () => {
  it("rejeita nova versão quando só o perfil legado diz Pro", async () => {
    const { documents, users, deps } = setup();
    const userId = "usr_legacy_pro_edit";
    users.setUser(userId, { plano: "pro" });
    const existing = await createExistingDocument(documents, userId);

    await expect(
      generateDocumentArtifact({
        requestId: crypto.randomUUID(),
        principal: { type: "user", userId },
        modeloSlug: "declaracao-residencia",
        respostas: { ...validAnswers, declarante_profissao: "Arquiteta" },
        existingDocumentId: existing.id,
        deps,
      })
    ).rejects.toMatchObject({ code: "PRO_REQUIRED", status: 402 });
  });

  it("permite nova versão quando existe período Pro pago vigente", async () => {
    const { documents, users, subscriptions, deps } = setup();
    const userId = "usr_paid_pro_edit";
    const now = Date.now();
    users.setUser(userId, { plano: "gratis" });
    await subscriptions.upsert({
      userId,
      provider: "abacatepay",
      providerSubscriptionId: "sub_paid_edit",
      providerCheckoutId: "checkout_paid_edit",
      providerProductId: "prod_pro",
      product: "pro",
      method: "card",
      status: "active",
      autoRenew: true,
      amountCents: 3990,
      paidThrough: now + 24 * 60 * 60 * 1000,
      lastPaidAt: now,
      lastPaymentId: "pay_paid_edit",
      createdAt: now,
      updatedAt: now,
    });
    const existing = await createExistingDocument(documents, userId);

    const result = await generateDocumentArtifact({
      requestId: crypto.randomUUID(),
      principal: { type: "user", userId },
      modeloSlug: "declaracao-residencia",
      respostas: { ...validAnswers, declarante_profissao: "Arquiteta" },
      existingDocumentId: existing.id,
      deps,
    });

    expect(result.version).toBe(2);
  });
});
