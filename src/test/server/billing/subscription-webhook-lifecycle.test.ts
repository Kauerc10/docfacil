import crypto from "node:crypto";
import { describe, expect, it } from "bun:test";
import { handleAbacatePayWebhook } from "@/app/api/webhooks/abacatepay/route";
import {
  InMemoryBillingSubscriptionsRepository,
  InMemoryBillingWebhookEventsRepository,
  InMemoryOrdersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import type { BillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { hasCurrentProAccess } from "@/lib/server/billing/subscription";

const PUBLIC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";
const SECRET = "webhook-secret-subscription-test";

function installRepos(): BillingRepositories {
  return {
    orders: new InMemoryOrdersRepository(true),
    subscriptions: new InMemoryBillingSubscriptionsRepository(true),
    webhookEvents: new InMemoryBillingWebhookEventsRepository(true),
  };
}

function request(event: Record<string, unknown>): Request {
  const rawBody = JSON.stringify(event);
  const signature = crypto
    .createHmac("sha256", PUBLIC_KEY)
    .update(rawBody)
    .digest("base64");
  return new Request(
    `http://localhost/api/webhooks/abacatepay?webhookSecret=${encodeURIComponent(SECRET)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body: rawBody,
    }
  );
}

function deps(repos: BillingRepositories, now: number) {
  return {
    repos,
    expectedSecret: SECRET,
    finalProduction: false,
    now: () => now,
  };
}

async function seedSubscription(
  repos: BillingRepositories,
  overrides: Partial<Parameters<BillingRepositories["subscriptions"]["upsert"]>[0]> = {}
) {
  const paidAt = Date.UTC(2026, 7, 24, 19, 45, 0);
  const record = {
    userId: "usr_pro_webhook",
    provider: "abacatepay" as const,
    providerSubscriptionId: "subs_pro_webhook",
    providerCheckoutId: "bill_pro_webhook",
    providerProductId: "prod_pro_3990",
    product: "pro" as const,
    method: "card" as const,
    status: "active" as const,
    autoRenew: true,
    amountCents: 3990 as const,
    paidThrough: Date.UTC(2026, 8, 24, 19, 45, 0),
    lastPaidAt: paidAt,
    lastPaymentId: "char_initial",
    createdAt: paidAt,
    updatedAt: paidAt,
    ...overrides,
  };
  await repos.subscriptions.upsert(record);
  return record;
}

describe("AbacatePay subscription webhook lifecycle", () => {
  it("subscription.completed ativa Pro pelo pedido local autenticado e confirma o pedido", async () => {
    const repos = installRepos();
    const paidAt = Date.UTC(2026, 7, 24, 19, 45, 0);
    const order = await repos.orders.createOrder({
      provider: "abacatepay",
      product: "pro",
      amountCents: 3990,
      buyer: { type: "user", userId: "usr_pro_webhook", email: "pro@example.com" },
      status: "pending",
      method: "card",
      createdAt: paidAt - 60_000,
    });
    await repos.orders.updateProviderRefs(order.id!, {
      providerCheckoutId: "bill_pro_webhook",
      providerStatus: "PENDING",
      providerDevMode: true,
    });

    const response = await handleAbacatePayWebhook(
      request({
        id: "log_subscription_completed",
        event: "subscription.completed",
        apiVersion: 2,
        devMode: true,
        data: {
          subscription: {
            id: "subs_pro_webhook",
            amount: 3990,
            currency: "BRL",
            method: "CARD",
            status: "ACTIVE",
            frequency: "MONTHLY",
            createdAt: "2026-08-24T19:45:00.000Z",
            updatedAt: "2026-08-24T19:45:05.000Z",
          },
          payment: {
            id: "char_subscription_initial",
            externalId: order.id,
            amount: 3990,
            paidAmount: 3990,
            status: "PAID",
            methods: ["CARD"],
            createdAt: "2026-08-24T19:45:00.000Z",
          },
          checkout: {
            id: "bill_pro_webhook",
            externalId: order.id,
            amount: 3990,
            paidAmount: 3990,
            frequency: "SUBSCRIPTION",
            items: [{ id: "prod_pro_3990", quantity: 1 }],
            status: "PAID",
            methods: ["CARD"],
          },
        },
      }),
      deps(repos, paidAt)
    );

    expect(response.status).toBe(200);
    const persistedOrder = await repos.orders.getOrder(order.id!);
    expect(persistedOrder?.status).toBe("paid");
    expect(persistedOrder?.providerSubscriptionId).toBe("subs_pro_webhook");

    const subscription = await repos.subscriptions.getByUserId("usr_pro_webhook");
    expect(subscription).toMatchObject({
      providerSubscriptionId: "subs_pro_webhook",
      providerCheckoutId: "bill_pro_webhook",
      providerProductId: "prod_pro_3990",
      status: "active",
      autoRenew: true,
      amountCents: 3990,
      lastPaymentId: "char_subscription_initial",
    });
    expect(subscription?.paidThrough).toBe(Date.UTC(2026, 8, 24, 19, 45, 0));
  });

  it("subscription.renewed estende do paidThrough quando a renovacao chega antecipada", async () => {
    const repos = installRepos();
    const current = await seedSubscription(repos);
    const renewalPaidAt = Date.UTC(2026, 8, 20, 12, 0, 0);

    const response = await handleAbacatePayWebhook(
      request({
        id: "log_subscription_renewed",
        event: "subscription.renewed",
        apiVersion: 2,
        devMode: true,
        data: {
          subscription: {
            id: current.providerSubscriptionId,
            amount: 3990,
            method: "CARD",
            status: "ACTIVE",
            frequency: "MONTHLY",
          },
          payment: {
            id: "char_renewal",
            amount: 3990,
            paidAmount: 3990,
            status: "PAID",
            methods: ["CARD"],
            createdAt: "2026-09-20T12:00:00.000Z",
          },
          checkout: {
            id: "bill_renewal",
            frequency: "SUBSCRIPTION",
            status: "PAID",
            methods: ["CARD"],
            items: [{ id: "prod_pro_3990", quantity: 1 }],
          },
        },
      }),
      deps(repos, renewalPaidAt)
    );

    expect(response.status).toBe(200);
    const subscription = await repos.subscriptions.getByUserId(current.userId);
    expect(subscription?.status).toBe("active");
    expect(subscription?.lastPaymentId).toBe("char_renewal");
    expect(subscription?.paidThrough).toBe(Date.UTC(2026, 9, 24, 19, 45, 0));
  });

  it("subscription.payment_failed registra past_due sem cortar o periodo ja pago", async () => {
    const repos = installRepos();
    const current = await seedSubscription(repos);
    const failedAt = Date.UTC(2026, 8, 20, 12, 0, 0);

    const response = await handleAbacatePayWebhook(
      request({
        id: "log_subscription_failed",
        event: "subscription.payment_failed",
        apiVersion: 2,
        devMode: true,
        data: {
          subscription: {
            id: current.providerSubscriptionId,
            amount: 3990,
            method: "CARD",
            status: "ACTIVE",
            frequency: "MONTHLY",
            retryPolicy: { maxRetry: 3, retryEvery: 2 },
          },
          installmentId: "intl_failed",
          installmentNumber: 2,
          retryNumber: 1,
        },
      }),
      deps(repos, failedAt)
    );

    expect(response.status).toBe(200);
    const subscription = await repos.subscriptions.getByUserId(current.userId);
    expect(subscription?.status).toBe("past_due");
    expect(subscription?.paidThrough).toBe(current.paidThrough);
    expect(hasCurrentProAccess(subscription, failedAt)).toBe(true);
  });

  it("subscription.cancelled encerra auto-renovacao sem apagar acesso ja pago", async () => {
    const repos = installRepos();
    const current = await seedSubscription(repos);
    const cancelledAt = Date.UTC(2026, 8, 20, 12, 0, 0);

    const response = await handleAbacatePayWebhook(
      request({
        id: "log_subscription_cancelled",
        event: "subscription.cancelled",
        apiVersion: 2,
        devMode: true,
        data: {
          subscription: {
            id: current.providerSubscriptionId,
            amount: 3990,
            method: "CARD",
            status: "CANCELLED",
            frequency: "MONTHLY",
            canceledAt: "2026-09-20T12:00:00.000Z",
            cancelPolicy: "NOW",
            cancelledDueTo: null,
          },
        },
      }),
      deps(repos, cancelledAt)
    );

    expect(response.status).toBe(200);
    const subscription = await repos.subscriptions.getByUserId(current.userId);
    expect(subscription?.status).toBe("cancelled");
    expect(subscription?.autoRenew).toBe(false);
    expect(subscription?.paidThrough).toBe(current.paidThrough);
    expect(hasCurrentProAccess(subscription, cancelledAt)).toBe(true);
  });
});
