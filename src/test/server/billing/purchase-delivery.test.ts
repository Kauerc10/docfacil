import { describe, expect, it } from "bun:test";
import { BackendError } from "../../../lib/server/errors";
import { capturePurchase, deliverPaidPurchase } from "../../../lib/server/billing/purchase-delivery";
import { InMemoryPurchaseDeliveryStore } from "../../../lib/server/billing/purchase-delivery-store";
import { InMemoryDocumentsRepository, InMemoryAccessRepository, InMemoryOrdersRepository, InMemoryGenerationRequestsRepository, InMemoryUsersRepository, InMemoryGenerationCommitRepository, InMemoryBillingSubscriptionsRepository } from "../../../lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "../../../lib/server/r2/storage";

const draft = { modeloSlug: "declaracao-residencia", respostas: { declarante_nome: "Ana", declarante_nacionalidade: "brasileira", declarante_estado_civil: "solteira", declarante_profissao: "Analista", declarante_cpf: "123.456.789-09", declarante_cep: "01001-000", declarante_rua: "Rua A", declarante_numero: "1", declarante_bairro: "Centro", declarante_cidade: "São Paulo", declarante_uf: "SP", finalidade: "comprovação" }, clausulasSelecionadas: [], guestContact: { email: "ana@example.com" } };

function order(status: "pending" | "paid" | "consumed" = "pending") {
  return { id: "order-1", provider: "abacatepay" as const, product: "avulso" as const, amountCents: 1990, buyer: { type: "guest" as const, email: "ana@example.com" }, status, createdAt: 1, ...(status === "consumed" ? { documentId: "doc-recovered" } : {}) };
}

function deps(current = order(), generate?: (input: any) => Promise<any>) {
  const orders = { getOrder: async () => current } as any;
  const generationRequests = { getRequest: async () => null } as any;
  return { orders, generationRequests, store: new InMemoryPurchaseDeliveryStore(), generate, now: (() => { let value = 1000; return () => value++; })() };
}

describe("purchase delivery", () => {
  it("captures a validated immutable snapshot and rejects a changed retry", async () => {
    const d = deps();
    await capturePurchase("order-1", { type: "guest", email: "ana@example.com" }, draft, d);
    await expect(capturePurchase("order-1", { type: "guest", email: "ana@example.com" }, { ...draft, respostas: { ...draft.respostas, declarante_nome: "Outra" } }, d)).rejects.toThrow("PURCHASE_SNAPSHOT_IMMUTABLE");
  });

  it("never delivers an unpaid order", async () => {
    const d = deps(order("pending"));
    await capturePurchase("order-1", { type: "guest", email: "ana@example.com" }, draft, d);
    await expect(deliverPaidPurchase("order-1", d)).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
  });

  it("retries a failed generation with a new generation request but does not duplicate a completed delivery", async () => {
    const d = deps(order("paid"));
    await capturePurchase("order-1", { type: "guest", email: "ana@example.com" }, draft, d);
    let calls = 0;
    d.generate = async (input: any) => { calls += 1; if (calls === 1) throw new BackendError("GENERATION_FAILED", 500, "falhou"); return { documentId: "doc-1", version: 1, artifactState: "ready", guestAccessPath: "/d/token" }; };
    await expect(deliverPaidPurchase("order-1", d)).rejects.toThrow("falhou");
    const retry = await deliverPaidPurchase("order-1", d);
    expect(retry?.status).toBe("completed");
    expect(calls).toBe(2);
    const again = await deliverPaidPurchase("order-1", d);
    expect(again?.result?.documentId).toBe("doc-1");
    expect(calls).toBe(2);
  });

  it("recovers a completed generation after a worker crash without generating again", async () => {
    const d = deps(order("paid"));
    await capturePurchase("order-1", { type: "guest", email: "ana@example.com" }, draft, d);
    const claimed = await d.store.claim({ orderId: "order-1", owner: "crashed-worker", now: 1001, leaseMs: 300000 });
    d.generationRequests.getRequest = async () => ({ status: "completed", documentId: "doc-recovered", targetVersion: 1, result: { guestAccessPath: "/d/recovered" } });
    const result = await deliverPaidPurchase("order-1", d);
    expect(result?.status).toBe("completed");
    expect(result?.result?.documentId).toBe("doc-recovered");
    expect(claimed.record?.generationRequestId).toContain("purchase:order-1:");
  });

  it("recovers a consumed order only when the completed request matches its document", async () => {
    const d = deps(order("consumed"));
    await capturePurchase("order-1", { type: "guest", email: "ana@example.com" }, draft, d);
    await d.store.claim({ orderId: "order-1", owner: "crashed-worker", now: 1001, leaseMs: 300000 });
    d.generationRequests.getRequest = async () => ({ status: "completed", documentId: "doc-recovered", targetVersion: 1 });
    const result = await deliverPaidPurchase("order-1", d);
    expect(result?.status).toBe("completed");
    expect(result?.result?.documentId).toBe("doc-recovered");
  });

  it("delivers through the real document orchestrator using the persisted paid snapshot", async () => {
    const orders = new InMemoryOrdersRepository();
    const order = await orders.createOrder({ provider: "mercadopago" as any, product: "avulso", amountCents: 1990, buyer: { type: "guest", email: "ana@example.com" }, status: "paid", createdAt: Date.now() });
    const docs = new InMemoryDocumentsRepository();
    const access = new InMemoryAccessRepository();
    const generationRequests = new InMemoryGenerationRequestsRepository();
    const users = new InMemoryUsersRepository();
    const commit = new InMemoryGenerationCommitRepository(docs, access, orders, generationRequests);
    const storage = new InMemoryArtifactStorage();
    const subscriptions = new InMemoryBillingSubscriptionsRepository();
    const d = { orders, generationRequests, store: new InMemoryPurchaseDeliveryStore(), generation: { repositories: { documents: docs, access, orders, generationRequests, users, generationCommit: commit }, storage, billingSubscriptions: subscriptions }, now: () => Date.now() };
    await capturePurchase(order.id!, { type: "guest", email: "ana@example.com" }, { ...draft, respostas: { ...draft.respostas, cidade_data: "São Paulo, 20 de outubro de 2026" } }, d);
    const result = await deliverPaidPurchase(order.id!, d);
    expect(result?.status).toBe("completed");
    expect(result?.result?.documentId).toBeDefined();
    expect((await orders.getOrder(order.id!))?.status).toBe("consumed");
    expect((await generationRequests.getRequest(result!.generationRequestId!))?.status).toBe("completed");
  });
});
