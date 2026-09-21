import { describe, expect, it } from "bun:test";
import crypto from "crypto";
import {
  parseMercadoPagoSignature,
  verifyMercadoPagoSignature,
  parseMercadoPagoWebhookEvent,
} from "@/lib/server/billing/mercadopago/webhook";

describe("Mercado Pago Webhook Verification & Parsing", () => {
  const secret = "test_webhook_secret_key_12345";
  const dataId = "9988776655";
  const requestId = "req_uuid_abc_123";
  const now = 1710000000000;
  const tsSeconds = Math.floor(now / 1000).toString();

  function generateValidSignature(id: string, reqId: string, ts: string, sec: string): string {
    const manifest = `id:${id};request-id:${reqId};ts:${ts};`;
    const hash = crypto.createHmac("sha256", sec).update(manifest).digest("hex");
    return `ts=${ts},v1=${hash}`;
  }

  describe("parseMercadoPagoSignature", () => {
    it("retorna null se o header for nulo ou vazio", () => {
      expect(parseMercadoPagoSignature(null)).toBeNull();
      expect(parseMercadoPagoSignature("")).toBeNull();
    });

    it("retorna null se faltar ts ou v1", () => {
      expect(parseMercadoPagoSignature("ts=12345")).toBeNull();
      expect(parseMercadoPagoSignature("v1=abcdef")).toBeNull();
    });

    it("faz o parse de ts e v1 corretamente", () => {
      const parsed = parseMercadoPagoSignature("ts=1710000000,v1=abcdef123456");
      expect(parsed).toEqual({
        ts: "1710000000",
        v1: "abcdef123456",
      });
    });
  });

  describe("verifyMercadoPagoSignature", () => {
    it("rejeita quando signature header é nulo", () => {
      const isValid = verifyMercadoPagoSignature({
        signatureHeader: null,
        requestIdHeader: requestId,
        dataId,
        secret,
        now,
      });
      expect(isValid).toBe(false);
    });

    it("rejeita quando o secret está vazio", () => {
      const validSig = generateValidSignature(dataId, requestId, tsSeconds, secret);
      const isValid = verifyMercadoPagoSignature({
        signatureHeader: validSig,
        requestIdHeader: requestId,
        dataId,
        secret: "",
        now,
      });
      expect(isValid).toBe(false);
    });

    it("rejeita assinatura adulterada ou incorreta", () => {
      const validSig = generateValidSignature(dataId, requestId, tsSeconds, "wrong_secret");
      const isValid = verifyMercadoPagoSignature({
        signatureHeader: validSig,
        requestIdHeader: requestId,
        dataId,
        secret,
        now,
      });
      expect(isValid).toBe(false);
    });

    it("rejeita quando timestamp é antigo (replay attack)", () => {
      const oldTsSeconds = Math.floor((now - 15 * 60 * 1000) / 1000).toString();
      const oldSig = generateValidSignature(dataId, requestId, oldTsSeconds, secret);
      const isValid = verifyMercadoPagoSignature({
        signatureHeader: oldSig,
        requestIdHeader: requestId,
        dataId,
        secret,
        now,
        maxAgeMs: 10 * 60 * 1000,
      });
      expect(isValid).toBe(false);
    });

    it("aceita assinatura válida com correspondência do manifesto", () => {
      const validSig = generateValidSignature(dataId, requestId, tsSeconds, secret);
      const isValid = verifyMercadoPagoSignature({
        signatureHeader: validSig,
        requestIdHeader: requestId,
        dataId,
        secret,
        now,
      });
      expect(isValid).toBe(true);
    });
  });

  describe("parseMercadoPagoWebhookEvent", () => {
    it("extrai dados de evento em payload JSON v1", () => {
      const body = {
        action: "payment.created",
        api_version: "v1",
        data: { id: "123456" },
        live_mode: false,
        type: "payment",
      };

      const event = parseMercadoPagoWebhookEvent(body);
      expect(event.id).toBe("123456");
      expect(event.type).toBe("payment");
      expect(event.action).toBe("payment.created");
      expect(event.liveMode).toBe(false);
    });

    it("extrai dados de query parameters quando fornecidos", () => {
      const searchParams = new URLSearchParams("data.id=987654&type=payment");
      const event = parseMercadoPagoWebhookEvent({}, searchParams);
      expect(event.id).toBe("987654");
      expect(event.type).toBe("payment");
    });

    it("dispara erro 400 se não houver id em nenhum lugar", () => {
      expect(() => parseMercadoPagoWebhookEvent({})).toThrow(/identificador/);
    });
  });
});
