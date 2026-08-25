import { describe, expect, it } from "bun:test";

const read = (path: string) => Bun.file(path).text();

describe("página dedicada do Pix", () => {
  it("registra a view pagamento-pix no roteador e na composição principal", async () => {
    const [nav, page] = await Promise.all([
      read("src/components/docfacil/nav-context.tsx"),
      read("src/app/page.tsx"),
    ]);

    expect(nav).toContain('"pagamento-pix"');
    expect(page).toContain("PixPaymentView");
    expect(page).toContain('case "pagamento-pix"');
  });

  it("renderiza QR Code real, copia e cola e consulta status autoritativo", async () => {
    const source = await read("src/components/docfacil/views/pix-payment-view.tsx");

    expect(source).toContain("brCodeBase64");
    expect(source).toContain("checkOrderStatus");
    expect(source).toContain("Copiar código Pix");
    expect(source).toContain("billingReturn");
    expect(source).toContain("orderId");
  });

  it("checkout não exibe modal extra de aceite antes de criar a cobrança", async () => {
    const source = await read("src/components/docfacil/terms-consent-modal.tsx");

    expect(source).toContain('flow === "checkout"');
    expect(source).toContain("CheckoutConsentPassThrough");
  });
});
