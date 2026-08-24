import { describe, expect, it } from "bun:test";

async function checkoutSource(): Promise<string> {
  return await Bun.file("src/components/docfacil/views/checkout-view.tsx").text();
}

describe("checkout real na interface", () => {
  it("trata PIX como resultado próprio em vez de forçar redirect", async () => {
    const source = await checkoutSource();

    expect(source).toContain('result.kind === "pix"');
    expect(source).toContain("setPixCheckout(result)");
    expect(source).toContain('result.kind === "redirect"');
  });

  it("oferece PIX e cartão somente no avulso e mantém Pro no cartão recorrente", async () => {
    const source = await checkoutSource();

    expect(source).toContain("Pagar com Pix");
    expect(source).toContain("Pagar com cartão");
    expect(source).toContain("Cartão recorrente");
    expect(source).toContain('method={plan === "pro" ? "card" : method}');
    expect(source.toLowerCase()).not.toContain("boleto");
  });
});
