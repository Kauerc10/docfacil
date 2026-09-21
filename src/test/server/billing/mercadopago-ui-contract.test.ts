import { describe, expect, it } from "bun:test";
import { PLAN_PRICES, PLAN_BILLING_DESC } from "@/lib/pricing";

async function checkoutSource(): Promise<string> {
  return await Bun.file("src/components/docfacil/views/checkout-view.tsx").text();
}

async function pixViewSource(): Promise<string> {
  return await Bun.file("src/components/docfacil/views/pix-payment-view.tsx").text();
}

describe("Mercado Pago UI & Contract Integration", () => {
  it("mantém preços canônicos de R$ 19,90 (avulso) e R$ 34,90 (pro)", () => {
    expect(PLAN_PRICES.avulso).toBe(19.9);
    expect(PLAN_PRICES.pro).toBe(34.9);
    expect(PLAN_BILLING_DESC.pro).toContain("34,90");
  });

  it("oferece Pix e Cartão via Mercado Pago na visualização de checkout", async () => {
    const source = await checkoutSource();

    expect(source).toContain("Pagar com Pix");
    expect(source).toContain("Pagar com cartão");
    expect(source).toContain("Mercado Pago");
    expect(source).toContain('result.kind === "pix"');
    expect(source).toContain("checkOrderStatus");
    expect(source).toContain('params.billingReturn === "1"');
  });

  it("exibe QR code, copia-e-cola e polling inteligente na tela de pagamento Pix", async () => {
    const source = await pixViewSource();

    expect(source).toContain("QR Code Pix");
    expect(source).toContain("Pix copia e cola");
    expect(source).toContain("Copiar código Pix");
    expect(source).toContain("checkOrderStatus");
    expect(source).toContain("Aguardando confirmação do pagamento");
    expect(source).toContain("Pagamento confirmado");
  });
});
