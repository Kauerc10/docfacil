import { describe, expect, it } from "bun:test";
import { BackendError } from "../../../lib/server/errors";
import { MercadoPagoClient } from "../../../lib/server/billing/mercadopago/client";

describe("MercadoPagoClient", () => {
  it("rejects a production token configured for test", () => {
    expect(() => new MercadoPagoClient({ accessToken: "TEST-1234567890abcdef", environment: "production", sellerId: "seller_123" })).toThrow(BackendError);
  });

  it("maps provider errors to a sanitized backend error", async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ message: "Authorization Bearer secret must not escape" }), { status: 401 })) as unknown as typeof fetch;
    const client = new MercadoPagoClient({ accessToken: "TEST-1234567890abcdef", environment: "test", sellerId: "seller_123", fetchImpl });
    await expect(client.request("/v1/payments/1")).rejects.toMatchObject({ code: "BILLING_PROVIDER_FAILED", status: 502 });
  });
});
