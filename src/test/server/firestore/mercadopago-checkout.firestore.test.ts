import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { configureAdminFirestore } from "@/lib/server/firebase-admin";
import { FirestoreCheckoutSessions } from "@/lib/server/billing/mercadopago/checkout-store";
import { createMercadoPagoCheckout } from "@/lib/server/billing/mercadopago/checkout";
import { FirestoreBillingOrdersRepository } from "@/lib/server/firestore/billing-repositories";
import { FirestoreGenerationRequestsRepository } from "@/lib/server/firestore/repositories";
import { FirestorePurchaseDeliveryStore } from "@/lib/server/billing/purchase-delivery-store";
import { capturePurchase } from "@/lib/server/billing/purchase-delivery";

const enabled = process.env.RUN_FIRESTORE_BILLING_TESTS === "true" && Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const draft = {
  modeloSlug: "declaracao-residencia",
  respostas: {
    declarante_nome: "Ana", declarante_nacionalidade: "brasileira", declarante_estado_civil: "solteira",
    declarante_profissao: "Analista", declarante_cpf: "123.456.789-09", declarante_cep: "01001-000",
    declarante_rua: "Rua A", declarante_numero: "1", declarante_bairro: "Centro",
    declarante_cidade: "São Paulo", declarante_uf: "SP", finalidade: "comprovação",
  },
  clausulasSelecionadas: [],
};

describe.skipIf(!enabled)("Mercado Pago checkout with real transactional storage", () => {
  const app = initializeApp({ projectId: "demo-docfacil-mp-checkout" }, `mp-checkout-${crypto.randomUUID()}`);
  let db: Firestore;
  beforeAll(() => { db = configureAdminFirestore(getFirestore(app)); });
  afterAll(async () => { await deleteApp(app); });

  it("persists immutable draft before payment and retries without a second charge", async () => {
    const sessions = new FirestoreCheckoutSessions(db);
    const orders = new FirestoreBillingOrdersRepository(db);
    const store = new FirestorePurchaseDeliveryStore(db);
    const input = { product: "avulso", method: "pix", requestId: crypto.randomUUID(), accessToken: "a".repeat(64), guestContact: { email: "ana@example.com" }, draft };
    let payments = 0;
    const deps = {
      sessions, orders,
      capture: (async (id, buyer, snapshot) => capturePurchase(id, buyer, snapshot, { orders, store, generationRequests: new FirestoreGenerationRequestsRepository(db) })) as typeof capturePurchase,
      provider: { createOneTimePayment: async ({ orderId }: { orderId: string }) => {
        payments++;
        expect((await store.get(orderId))?.snapshot.modeloSlug).toBe(draft.modeloSlug);
        expect((await orders.getOrder(orderId))?.amountCents).toBe(1990);
        return { kind: "pix" as const, providerPaymentId: "12345", providerStatus: "pending", brCode: "pix-code", brCodeBase64: "image", expiresAt: new Date(Date.now() + 1800000).toISOString(), devMode: true };
      } },
    };
    const req = () => new Request("http://localhost:3000/api/checkout/create", { method: "POST" });
    const first = await createMercadoPagoCheckout(req(), { type: "guest" }, input, deps);
    const body = await first.json();
    const retry = await createMercadoPagoCheckout(req(), { type: "guest" }, input, deps);
    expect(await retry.json()).toEqual(body);
    expect(payments).toBe(1);
    expect(first.headers.get("set-cookie")).toContain("HttpOnly");
    await expect(createMercadoPagoCheckout(req(), { type: "guest" }, { ...input, draft: { ...draft, respostas: { ...draft.respostas, declarante_nome: "Outra" } } }, deps))
      .rejects.toMatchObject({ status: 409 });
  });

  it("allows only one owner for concurrent creation of the same logical checkout", async () => {
    const sessions = new FirestoreCheckoutSessions(db);
    const input = {
      orderId: crypto.randomUUID(), requestHash: "request", tokenHash: "token", now: Date.now(),
      order: { provider: "mercadopago" as const, product: "avulso" as const, amountCents: 1990, buyer: { type: "guest" as const, email: "ana@example.com" }, status: "pending" as const, createdAt: Date.now() },
    };
    const results = await Promise.all([sessions.begin(input), sessions.begin(input)]);
    expect(results.filter(x => x.acquired)).toHaveLength(1);
    await expect(sessions.begin({ ...input, tokenHash: "another-token" })).rejects.toMatchObject({ status: 409 });
  });

  it("rejects unavailable Pro and invalid guest data without external side effects", async () => {
    const req = new Request("http://localhost:3000/api/checkout/create", { method: "POST" });
    const base = { product: "pro", method: "card", requestId: crypto.randomUUID(), accessToken: "a".repeat(64) };
    await expect(createMercadoPagoCheckout(req, { type: "user", userId: "u" }, base)).rejects.toMatchObject({ code: "BILLING_METHOD_UNAVAILABLE" });
    await expect(createMercadoPagoCheckout(req, { type: "guest" }, { ...base, product: "avulso", draft })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
