import { describe, expect, it } from "bun:test";
import {
  parseAbacateWebhookEvent,
  secretsMatch,
  verifyAbacateWebhookSignature,
} from "@/lib/server/billing/abacate/webhook";

const RAW_FIXTURE =
  '{"id":"log_test_001","event":"transparent.completed","apiVersion":2,"devMode":true,"data":{"transparent":{"id":"pix_001","externalId":"ord_001","status":"PAID"}}}';
const FIXTURE_SIGNATURE = "ECiJ2Nxe/UA7kE0tmYGIfpKBunqvnJV0sIdNLXBCEwE=";

describe("AbacatePay webhook v2 security", () => {
  it("valida HMAC-SHA256 sobre o corpo raw e rejeita qualquer alteracao", () => {
    expect(verifyAbacateWebhookSignature(RAW_FIXTURE, FIXTURE_SIGNATURE)).toBe(true);
    expect(
      verifyAbacateWebhookSignature(
        RAW_FIXTURE.replace('"PAID"', '"PENDING"'),
        FIXTURE_SIGNATURE
      )
    ).toBe(false);
    expect(verifyAbacateWebhookSignature(RAW_FIXTURE, "assinatura-invalida")).toBe(false);
  });

  it("compara o webhook secret sem aceitar prefixos ou valores vazios", () => {
    expect(secretsMatch("secret-1234567890", "secret-1234567890")).toBe(true);
    expect(secretsMatch("secret-1234567890x", "secret-1234567890")).toBe(false);
    expect(secretsMatch("", "secret-1234567890")).toBe(false);
    expect(secretsMatch(undefined, "secret-1234567890")).toBe(false);
  });

  it("aceita campos adicionais do envelope v2 sem engessar o payload inteiro", () => {
    const parsed = parseAbacateWebhookEvent(
      JSON.stringify({
        id: "log_flexible",
        event: "transparent.completed",
        apiVersion: 2,
        devMode: true,
        data: { transparent: { id: "pix_1", externalId: "ord_1" }, futureField: 123 },
        futureTopLevelField: "ok",
      })
    );

    expect(parsed.id).toBe("log_flexible");
    expect(parsed.event).toBe("transparent.completed");
    expect(parsed.apiVersion).toBe(2);
    expect(parsed.data).toEqual({
      transparent: { id: "pix_1", externalId: "ord_1" },
      futureField: 123,
    });
  });

  it("rejeita corpo invalido ou envelope sem identidade v2", () => {
    expect(() => parseAbacateWebhookEvent("nao-json")).toThrow();
    expect(() =>
      parseAbacateWebhookEvent(JSON.stringify({ event: "transparent.completed", apiVersion: 2, data: {} }))
    ).toThrow();
    expect(() =>
      parseAbacateWebhookEvent(JSON.stringify({ id: "log_1", event: "transparent.completed", apiVersion: 1, data: {} }))
    ).toThrow();
  });
});
