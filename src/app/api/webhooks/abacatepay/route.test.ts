import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "bun:test";
import { handleAbacatePayWebhook } from "./route";
import {
  InMemoryBillingSubscriptionsRepository,
  InMemoryBillingWebhookEventsRepository,
  InMemoryOrdersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import type { BillingRepositories } from "@/lib/server/firestore/billing-repositories";

const PUBLIC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";
const SECRET = "webhook-secret-test-123";

function sign(rawBody: string): string {
  return crypto.createHmac("sha256", PUBLIC_KEY).update(rawBody).digest("base64");
}

function makeRequest(rawBody: string, options?: { secret?: string; signature?: string }): Request {
  const secret = options?.secret ?? SECRET;
  const url = new URL("http://localhost/api/webhooks/abacatepay");
  url.searchParams.set("webhookSecret", secret);
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": options?.signature ?? sign(rawBody),
    },
    body: rawBody,
  });
}

function installRepos(): BillingRepositories {
  return {
    orders: new InMemoryOrdersRepository(true),
    subscriptions: new InMemoryBillingSubscriptionsRepository(true),
    webhookEvents: new InMemoryBillingWebhookEventsRepository(true),
  };
}

function deps(repos: BillingRepositories, finalProduction = false) {
  return {
    repos,
    expectedSecret: SECRET,
    finalProduction,
    now: () => Date.UTC(2026, 7, 24, 19, 45, 0),
  };
}

afterEach(() => {
  delete process.env.ABACATEPAY_WEBHOOK_SECRET;
});

describe("POST /api/webhooks/abacatepay", () => {
  it("confirma avulso somente com secret e HMAC validos", async () => {
    const repos = installRepos();
    const order = await repos.orders.createOrder({
      provider: "abacatepay",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "pending",
      method: "pix",
      createdAt: Date.now(),
    });
    const rawBody = JSON.stringify({
      id: "log_pix_paid_1",
      event: "transparent.completed",
      apiVersion: 2,
      devMode: true,
      data: {
        transparent: {
          id: "char_pix_1",
          externalId: order.id,
          status: "PAID",
          methods: ["PIX"],
        },
      },
    });

    const response = await handleAbacatePayWebhook(makeRequest(rawBody), deps(repos));
    const body = await response.json();
    const persisted = await repos.orders.getOrder(order.id!);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(persisted?.status).toBe("paid");
    expect(persisted?.providerPaymentId).toBe("char_pix_1");
    expect(await repos.webhookEvents.exists("log_pix_paid_1")).toBe(true);
  });

  it("rejeita secret ou assinatura invalidos sem alterar o pedido", async () => {
    const repos = installRepos();
    const order = await repos.orders.createOrder({
      provider: "abacatepay",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "pending",
      method: "pix",
      createdAt: Date.now(),
    });
    const rawBody = JSON.stringify({
      id: "log_invalid_auth",
      event: "transparent.completed",
      apiVersion: 2,
      devMode: true,
      data: { transparent: { id: "char_1", externalId: order.id, status: "PAID" } },
    });

    const badSecret = await handleAbacatePayWebhook(
      makeRequest(rawBody, { secret: "secret-errado" }),
      deps(repos)
    );
    const badSignature = await handleAbacatePayWebhook(
      makeRequest(rawBody, { signature: "assinatura-errada" }),
      deps(repos)
    );

    expect(badSecret.status).toBe(401);
    expect(badSignature.status).toBe(401);
    expect((await repos.orders.getOrder(order.id!))?.status).toBe("pending");
    expect(await repos.webhookEvents.exists("log_invalid_auth")).toBe(false);
  });

  it("deduplica o mesmo event id e responde 200 sem reprocessar", async () => {
    const repos = installRepos();
    const order = await repos.orders.createOrder({
      provider: "abacatepay",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "pending",
      method: "pix",
      createdAt: Date.now(),
    });
    const rawBody = JSON.stringify({
      id: "log_duplicate",
      event: "transparent.completed",
      apiVersion: 2,
      devMode: true,
      data: { transparent: { id: "char_dup", externalId: order.id, status: "PAID" } },
    });

    const first = await handleAbacatePayWebhook(makeRequest(rawBody), deps(repos));
    const paidAt = (await repos.orders.getOrder(order.id!))?.paidAt;
    const second = await handleAbacatePayWebhook(makeRequest(rawBody), deps(repos));
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(secondBody.duplicate).toBe(true);
    expect((await repos.orders.getOrder(order.id!))?.paidAt).toBe(paidAt);
  });

  it("rejeita evento devMode no ambiente final de producao", async () => {
    const repos = installRepos();
    const rawBody = JSON.stringify({
      id: "log_dev_prod",
      event: "transparent.completed",
      apiVersion: 2,
      devMode: true,
      data: { transparent: { id: "char_dev", externalId: "ord_any", status: "PAID" } },
    });

    const response = await handleAbacatePayWebhook(
      makeRequest(rawBody),
      deps(repos, true)
    );

    expect(response.status).toBe(403);
    expect(await repos.webhookEvents.exists("log_dev_prod")).toBe(false);
  });
});
