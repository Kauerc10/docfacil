import { describe, expect, it } from "bun:test";
import { MercadoPagoBillingProvider } from "../../../lib/server/billing/mercadopago/provider";
import { MercadoPagoClient } from "../../../lib/server/billing/mercadopago/client";

function clientWith(responses: unknown[]) {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(responses.shift() ?? {}), { status: 201, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return {
    requests,
    client: new MercadoPagoClient({
      accessToken: "TEST-1234567890abcdef",
      environment: "test",
      sellerId: "seller_123",
      fetchImpl,
    }),
  };
}

describe("MercadoPagoBillingProvider", () => {
  it("creates a Pix payment with stable order idempotency and returns QR data", async () => {
    const { client, requests } = clientWith([{ id: 42, status: "pending", date_of_expiration: "2026-10-20T15:00:00Z", point_of_interaction: { transaction_data: { qr_code: "pix-code", qr_code_base64: "base64" } } }]);
    const provider = new MercadoPagoBillingProvider(client);

    const result = await provider.createOneTimePayment({ orderId: "order-42", product: "avulso", amountCents: 1990, method: "pix", completionUrl: "https://docfacil.test/checkout", buyerEmail: "buyer@example.com" });

    expect(result.kind).toBe("pix");
    expect(result.kind).toBe("pix");
    if (result.kind === "pix") expect(result.providerPaymentId).toBe("42");
    expect(requests[0].url).toBe("https://api.mercadopago.com/v1/payments");
    expect(new Headers(requests[0].init.headers).get("X-Idempotency-Key")).toBe("order-42");
    expect(JSON.parse(String(requests[0].init.body))).toMatchObject({ payment_method_id: "pix", external_reference: "order-42", transaction_amount: 19.9 });
  });

  it("creates a hosted credit preference restricted to one installment", async () => {
    const { client, requests } = clientWith([{ id: "pref-1", init_point: "https://checkout.mercadopago.com/pref-1" }]);
    const provider = new MercadoPagoBillingProvider(client);
    const result = await provider.createOneTimePayment({ orderId: "order-card", product: "avulso", amountCents: 1990, method: "card", completionUrl: "https://docfacil.test/checkout", buyerEmail: "buyer@example.com" });

    expect(result.kind).toBe("hosted");
    expect(result.kind).toBe("hosted");
    if (result.kind === "hosted") expect(result.checkoutUrl).toContain("pref-1");
    const body = JSON.parse(String(requests[0].init.body));
    expect(body.payment_methods.installments).toBe(1);
    expect(body.payer.email).toBe("buyer@example.com");
  });

  it("creates a pending monthly subscription and requires payer email", async () => {
    const { client, requests } = clientWith([{ id: "sub-1", status: "pending", init_point: "https://checkout.mercadopago.com/sub-1" }]);
    const provider = new MercadoPagoBillingProvider(client);
    const result = await provider.createSubscription({ orderId: "order-pro", amountCents: 3990, completionUrl: "https://docfacil.test/pro", buyerEmail: "buyer@example.com" });

    expect(result.providerCheckoutId).toBe("sub-1");
    expect(JSON.parse(String(requests[0].init.body))).toMatchObject({ payer_email: "buyer@example.com", status: "pending", auto_recurring: { transaction_amount: 39.9, frequency: 1, frequency_type: "months" } });
  });
});
