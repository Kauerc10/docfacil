import { describe, expect, it, mock } from "bun:test";
import { AbacatePayClient } from "@/lib/server/billing/abacate/client";
import { AbacatePayBillingProvider } from "@/lib/server/billing/abacate/provider";
import { BackendError } from "@/lib/server/errors";

function createHarness() {
  const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
  const fetchMock = mock(
    async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = new URL(input.toString());
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ path: url.pathname, body });

      if (url.pathname.endsWith("/transparents/create")) {
        return Response.json({
          success: true,
          error: null,
          data: {
            id: "pix_char_123",
            amount: 1990,
            status: "PENDING",
            devMode: true,
            brCode: "000201pix",
            brCodeBase64: "data:image/png;base64,abc",
            expiresAt: "2026-08-24T22:00:00.000Z",
          },
        });
      }

      return Response.json({
        success: true,
        error: null,
        data: {
          id: url.pathname.includes("subscriptions") ? "sub_checkout_123" : "bill_123",
          url: "https://pay.abacatepay.com/checkout/test",
          status: "PENDING",
          devMode: true,
        },
      });
    }
  );

  const client = new AbacatePayClient(
    "dev_test_key",
    fetchMock as unknown as typeof fetch
  );
  const provider = new AbacatePayBillingProvider(client, {
    avulsoProductId: "prod_avulso",
    proProductId: "prod_pro_monthly",
  });

  return { provider, calls };
}

describe("AbacatePayBillingProvider v2", () => {
  it("creates transparent PIX with local order correlation", async () => {
    const { provider, calls } = createHarness();

    const result = await provider.createOneTimePayment({
      orderId: "ord_pix_123",
      product: "avulso",
      amountCents: 1990,
      method: "pix",
      completionUrl: "https://docfacil.test/retorno",
    });

    expect(result).toMatchObject({
      kind: "pix",
      providerPaymentId: "pix_char_123",
      devMode: true,
    });
    expect(calls[0].path).toBe("/v2/transparents/create");
    expect(calls[0].body).toEqual({
      method: "PIX",
      data: {
        amount: 1990,
        externalId: "ord_pix_123",
        description: "Documento avulso",
        expiresIn: 1800,
        metadata: { product: "avulso", orderId: "ord_pix_123" },
      },
    });
  });

  it("creates one-time card checkout with object items and CARD only", async () => {
    const { provider, calls } = createHarness();

    const result = await provider.createOneTimePayment({
      orderId: "ord_card_123",
      product: "avulso",
      amountCents: 1990,
      method: "card",
      completionUrl: "https://docfacil.test/retorno",
    });

    expect(result).toMatchObject({ kind: "hosted", providerCheckoutId: "bill_123" });
    expect(calls[0].path).toBe("/v2/checkouts/create");
    expect(calls[0].body).toEqual({
      items: [{ id: "prod_avulso", quantity: 1 }],
      methods: ["CARD"],
      externalId: "ord_card_123",
      completionUrl: "https://docfacil.test/retorno",
      returnUrl: "https://docfacil.test/retorno",
      metadata: { product: "avulso", orderId: "ord_card_123" },
    });
  });

  it("creates Pro as a recurring CARD-only subscription with local order correlation", async () => {
    const { provider, calls } = createHarness();

    const result = await provider.createSubscription({
      orderId: "ord_pro_123",
      amountCents: 3990,
      completionUrl: "https://docfacil.test/pro/retorno",
    });

    expect(result).toMatchObject({
      kind: "hosted",
      providerCheckoutId: "sub_checkout_123",
    });
    expect(calls[0].path).toBe("/v2/subscriptions/create");
    expect(calls[0].body).toEqual({
      items: [{ id: "prod_pro_monthly", quantity: 1 }],
      methods: ["CARD"],
      externalId: "ord_pro_123",
      completionUrl: "https://docfacil.test/pro/retorno",
      metadata: { product: "pro", orderId: "ord_pro_123" },
    });
  });

  it("fails closed when hosted product ids are missing", async () => {
    const client = new AbacatePayClient(
      "dev_test_key",
      mock(async () => {
        throw new Error("provider must not be called");
      }) as unknown as typeof fetch
    );
    const provider = new AbacatePayBillingProvider(client, {});

    await expect(
      provider.createOneTimePayment({
        orderId: "ord_missing",
        product: "avulso",
        amountCents: 1990,
        method: "card",
        completionUrl: "https://docfacil.test/retorno",
      })
    ).rejects.toBeInstanceOf(BackendError);

    await expect(
      provider.createSubscription({
        orderId: "ord_missing_pro",
        amountCents: 3990,
        completionUrl: "https://docfacil.test/retorno",
      })
    ).rejects.toMatchObject({ code: "BILLING_NOT_CONFIGURED", status: 503 });
  });
});
