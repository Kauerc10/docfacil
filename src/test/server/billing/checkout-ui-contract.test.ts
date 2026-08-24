import { describe, expect, it } from "bun:test";

async function checkoutSource(): Promise<string> {
  return await Bun.file("src/components/docfacil/views/checkout-view.tsx").text();
}

async function successSource(): Promise<string> {
  return await Bun.file("src/components/docfacil/views/sucesso-view.tsx").text();
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

  it("retorna do gateway para o checkout e só continua após status autoritativo", async () => {
    const source = await checkoutSource();

    expect(source).toContain('success.searchParams.set("view", "checkout")');
    expect(source).toContain("checkOrderStatus");
    expect(source).toContain('params.billingReturn === "1"');
    expect(source).toContain('status.status === "paid"');
    expect(source).toContain('status.status === "consumed"');
  });

  it("PIX consulta o mesmo status autoritativo enquanto aguarda confirmação", async () => {
    const source = await checkoutSource();

    expect(source).toContain("const watchedOrderId = pixCheckout?.orderId ?? returnOrderId");
    expect(source).toContain("orderId: watchedOrderId");
    expect(source).toContain("checkOrderStatus");
    expect(source).toContain("Aguardando confirmação do pagamento");
  });

  it("sucesso não finaliza orderId sem confirmar que o servidor o marcou como pago", async () => {
    const source = await successSource();

    expect(source).toContain("checkOrderStatus");
    expect(source).toContain('paymentStatus.status !== "paid"');
    expect(source.indexOf("checkOrderStatus")).toBeLessThan(source.indexOf("finalizeDocument({"));
  });
});
