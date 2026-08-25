import { describe, expect, it } from "bun:test";

describe("resposta da criação de checkout real", () => {
  it("preserva checkout hospedado como redirect", async () => {
    const checkoutService = (await import(
      "@/lib/services/checkout-service"
    )) as Record<string, unknown>;
    const parseCheckoutApiResponse = checkoutService.parseCheckoutApiResponse;

    expect(typeof parseCheckoutApiResponse).toBe("function");
    if (typeof parseCheckoutApiResponse !== "function") return;

    expect(
      parseCheckoutApiResponse({
        kind: "redirect",
        orderId: "ord_card",
        product: "pro",
        amountCents: 3990,
        checkoutUrl: "https://abacatepay.com/pay/checkout_1",
        devMode: true,
      })
    ).toEqual({
      kind: "redirect",
      orderId: "ord_card",
      checkoutUrl: "https://abacatepay.com/pay/checkout_1",
    });
  });

  it("preserva PIX transparente sem inventar checkoutUrl", async () => {
    const checkoutService = (await import(
      "@/lib/services/checkout-service"
    )) as Record<string, unknown>;
    const parseCheckoutApiResponse = checkoutService.parseCheckoutApiResponse;

    expect(typeof parseCheckoutApiResponse).toBe("function");
    if (typeof parseCheckoutApiResponse !== "function") return;

    expect(
      parseCheckoutApiResponse({
        kind: "pix",
        orderId: "ord_pix",
        product: "avulso",
        amountCents: 1990,
        pix: {
          brCode: "000201010212...",
          brCodeBase64: "data:image/png;base64,abc",
          expiresAt: 1787600000000,
        },
        devMode: true,
      })
    ).toEqual({
      kind: "pix",
      orderId: "ord_pix",
      pix: {
        brCode: "000201010212...",
        brCodeBase64: "data:image/png;base64,abc",
        expiresAt: 1787600000000,
      },
    });
  });

  it("falha fechado para resposta incompleta do backend", async () => {
    const checkoutService = (await import(
      "@/lib/services/checkout-service"
    )) as Record<string, unknown>;
    const parseCheckoutApiResponse = checkoutService.parseCheckoutApiResponse;

    expect(typeof parseCheckoutApiResponse).toBe("function");
    if (typeof parseCheckoutApiResponse !== "function") return;

    expect(() =>
      parseCheckoutApiResponse({ kind: "redirect", orderId: "ord_missing_url" })
    ).toThrow("Resposta de checkout inválida");
  });
});
