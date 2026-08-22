import { test, expect } from "@playwright/test";
import { completeDemoCheckout, openSinglePurchaseCheckout } from "./support/checkout";
import { fillDocumentUntilFinalization } from "./support/document-form";
import {
  acceptOptionalCookies,
  mockCepLookup,
  waitForSearchParams,
} from "./support/navigation";

test.describe("Guest Purchase and Download Flow", () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await mockCepLookup(page);
  });

  test("completes guest creation, checkout with orderId preservation, magic link generation and download", async ({
    page,
  }) => {
    await page.goto("/?view=criar&slug=declaracao-residencia");
    await acceptOptionalCookies(page);

    const finalize = await fillDocumentUntilFinalization(page, {
      fieldValues: {
        declarante_nome: "Maria da Silva",
        declarante_nacionalidade: "Brasileiro(a)",
        declarante_estado_civil: "solteiro(a)",
        declarante_profissao: "Engenheira",
        declarante_cpf: "111.444.777-35",
        declarante_cep: "01310-100",
        declarante_rua: "Avenida Paulista",
        declarante_numero: "1500",
        declarante_bairro: "Bela Vista",
        declarante_cidade: "São Paulo",
        declarante_uf: "SP",
        finalidade: "Comprovante para abertura de conta bancária",
      },
    });

    await finalize.click();
    await waitForSearchParams(page, { view: "sucesso" });

    await openSinglePurchaseCheckout(page);
    await completeDemoCheckout(page, {
      email: "maria.teste@docfacil.com",
      expectGuestConsent: true,
    });

    await page.waitForURL(/\/d\/[A-Za-z0-9_-]{20,}/, {
      timeout: 45000,
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("button", { name: /^baixar\s/i }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("completes guest creation with dynamic clause extras, checkout, magic link and download", async ({
    page,
  }) => {
    await page.goto("/?view=criar&slug=contrato-locacao");
    await acceptOptionalCookies(page);

    const finalize = await fillDocumentUntilFinalization(page, {
      fieldValues: {
        locador_nome: "Carlos Santos",
        locador_nacionalidade: "Brasileiro(a)",
        locador_estado_civil: "solteiro(a)",
        locador_profissao: "Empresário",
        locador_cpf: "111.444.777-35",
        locatario_nome: "Juliana Lima",
        locatario_nacionalidade: "Brasileiro(a)",
        locatario_estado_civil: "solteiro(a)",
        locatario_profissao: "Arquiteta",
        locatario_cpf: "529.982.247-25",
        imovel_cep: "04538-133",
        imovel_rua: "Rua Funchal",
        imovel_numero: "200",
        imovel_bairro: "Vila Olímpia",
        imovel_cidade: "São Paulo",
        imovel_uf: "SP",
        valor: "3500,00",
        prazo: "30",
        dia_vencimento: "10",
        forma_pagamento: "PIX",
      },
      residents: [],
      rentalGuarantee: "Fiador",
      clauseExtras: {
        fiador_nome: "Roberto Alcantara",
        fiador_cpf: "935.411.347-80",
      },
    });

    await finalize.click();
    await waitForSearchParams(page, { view: "sucesso" });

    await openSinglePurchaseCheckout(page);
    await completeDemoCheckout(page, {
      email: "juliana.teste@docfacil.com",
      expectGuestConsent: true,
    });

    await page.waitForURL(/\/d\/[A-Za-z0-9_-]{20,}/, {
      timeout: 45000,
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("button", { name: /^baixar\s/i }).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
