import { describe, expect, it } from "bun:test";

describe("payload de criação do checkout real", () => {
  it("serializa Pro autenticado com cartão sem confiar identidade do client", async () => {
    const checkoutService = (await import(
      "@/lib/services/checkout-service"
    )) as Record<string, unknown>;
    const buildCheckoutCreatePayload = checkoutService.buildCheckoutCreatePayload;

    expect(typeof buildCheckoutCreatePayload).toBe("function");
    if (typeof buildCheckoutCreatePayload !== "function") return;

    const payload = buildCheckoutCreatePayload({
      plan: "pro",
      authenticated: true,
      userEmail: "user@example.com",
      method: "pix",
      successUrl: "https://docfacil.com.br/?view=checkout",
    });

    expect(payload).toEqual({
      product: "pro",
      method: "card",
      successUrl: "https://docfacil.com.br/?view=checkout",
    });
  });

  it("serializa avulso guest com o contato mínimo e o método escolhido", async () => {
    const checkoutService = (await import(
      "@/lib/services/checkout-service"
    )) as Record<string, unknown>;
    const buildCheckoutCreatePayload = checkoutService.buildCheckoutCreatePayload;

    expect(typeof buildCheckoutCreatePayload).toBe("function");
    if (typeof buildCheckoutCreatePayload !== "function") return;

    const payload = buildCheckoutCreatePayload({
      plan: "avulso",
      authenticated: false,
      userEmail: " guest@example.com ",
      method: "pix",
      successUrl: "https://docfacil.com.br/?view=checkout",
    });

    expect(payload).toEqual({
      product: "avulso",
      method: "pix",
      guestContact: { email: "guest@example.com" },
      successUrl: "https://docfacil.com.br/?view=checkout",
    });
  });
});
