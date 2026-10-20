import crypto from "node:crypto";
import { describe, expect, it } from "bun:test";
import { parseMercadoPagoWebhookEvent, verifyMercadoPagoWebhookSignature } from "../../../lib/server/billing/mercadopago/webhook";

const secret = "webhook-secret-for-tests";

function signed(rawBody: string, id: string, requestId: string, ts: string) {
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
  return `ts=${ts},v1=${crypto.createHmac("sha256", secret).update(manifest).digest("hex")}`;
}

describe("Mercado Pago webhook", () => {
  it("accepts the documented manifest and matching body/query resource id", () => {
    const body = JSON.stringify({ id: "evt-1", type: "payment", action: "payment.updated", data: { id: "pay-1" } });
    const signature = signed(body, "pay-1", "request-1", "1760950000");
    expect(verifyMercadoPagoWebhookSignature({ rawBody: body, xSignature: signature, xRequestId: "request-1", queryDataId: "pay-1", webhookSecret: secret })).toBe(true);
    expect(parseMercadoPagoWebhookEvent(body, "pay-1").resourceId).toBe("pay-1");
  });

  it("rejects a body/query mismatch even with an otherwise valid signature", () => {
    const body = JSON.stringify({ type: "payment", data: { id: "pay-body" } });
    const signature = signed(body, "pay-query", "request-1", "1760950000");
    expect(verifyMercadoPagoWebhookSignature({ rawBody: body, xSignature: signature, xRequestId: "request-1", queryDataId: "pay-query", webhookSecret: secret })).toBe(false);
    expect(() => parseMercadoPagoWebhookEvent(body, "pay-query")).toThrow();
  });
});
