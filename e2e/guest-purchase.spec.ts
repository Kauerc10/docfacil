import { test, expect } from "@playwright/test";

test.describe("Guest Purchase and Download Flow", () => {
  test("completes guest creation, checkout with orderId preservation, magic link generation and download", async ({
    page,
  }) => {
    // 1. Open model creation as guest
    await page.goto("/?view=criar&slug=declaracao-residencia");

    // Fill Stage 0 (Declarante + Endereço)
    const nameInput = page.locator("#declarante_nome");
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill("Maria da Silva");

    await page.locator("#declarante_profissao").fill("Engenheira");
    await page.locator("#declarante_cpf").fill("123.456.789-00");
    await page.locator("#declarante_cep").fill("01310-100");
    await page.locator("#declarante_rua").fill("Av. Paulista");
    await page.locator("#declarante_numero").fill("1500");
    await page.locator("#declarante_bairro").fill("Bela Vista");
    await page.locator("#declarante_cidade").fill("São Paulo");
    await page.locator("#declarante_uf").fill("SP");

    // Advance to Stage 1 (Finalidade)
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 1: Finalidade
    const finalidadeInput = page.locator("#finalidade, textarea[name='finalidade'], textarea");
    await expect(finalidadeInput.first()).toBeVisible({ timeout: 10000 });
    await finalidadeInput.first().fill("Comprovante para abertura de conta bancária");

    // Finalize creation
    await page.getByRole("button", { name: /gerar|finalizar|avançar/i }).click();

    // Reaches SucessoView
    await page.waitForURL((url) => url.searchParams.get("view") === "sucesso", { timeout: 20000 });

    // Click single purchase CTA from PaymentBarrier
    const buyButton = page.getByRole("button", { name: /baixar por r\$|comprar|desbloquear/i }).first();
    await expect(buyButton).toBeVisible({ timeout: 10000 });
    await buyButton.click();

    // Reaches CheckoutView
    await page.waitForURL((url) => url.searchParams.get("view") === "checkout", { timeout: 10000 });

    // Fill guest email
    const emailInput = page.locator("input[type='email']").first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill("maria.teste@docfacil.com");

    // Click pay CTA
    const payCta = page.getByRole("button", { name: /pagar/i }).first();
    await payCta.click();

    // Terms & Privacy consent modal opens
    const termsCheckbox = page.locator("#consent-terms, input[id='consent-terms']").first();
    await expect(termsCheckbox).toBeVisible({ timeout: 5000 });
    await termsCheckbox.click();

    const privacyCheckbox = page.locator("#consent-privacy, input[id='consent-privacy']").first();
    await privacyCheckbox.click();

    const acceptConsentBtn = page.getByRole("button", { name: /aceitar e continuar/i }).first();
    await expect(acceptConsentBtn).toBeEnabled({ timeout: 5000 });
    await acceptConsentBtn.click();

    // Must return to SucessoView with orderId preserved in the URL!
    await page.waitForURL(
      (url) => {
        return (
          url.searchParams.get("view") === "sucesso" &&
          Boolean(url.searchParams.get("orderId"))
        );
      },
      { timeout: 25000 }
    );

    // SucessoView automatically processes guest order and redirects to /d/<token>
    await page.waitForURL(/\/d\/[A-Za-z0-9_-]{20,}/, { timeout: 35000 });

    // On /d/<token>, download button must be visible
    const downloadButton = page.getByRole("button", {
      name: /baixar documento|baixar pdf|download/i,
    }).first();
    await expect(downloadButton).toBeVisible({ timeout: 15000 });
  });

  test("completes guest creation with dynamic clause extras, checkout, magic link and download", async ({
    page,
  }) => {
    // 1. Open model with dynamic clauses
    await page.goto("/?view=criar&slug=contrato-locacao");

    // Stage 0: Locador
    const locadorNome = page.locator("#locador_nome");
    await expect(locadorNome).toBeVisible({ timeout: 15000 });
    await locadorNome.fill("Carlos Santos");
    await page.locator("#locador_cpf").fill("111.222.333-44");
    await page.locator("#locador_profissao").fill("Empresário");
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 1: Locatário
    const locatarioNome = page.locator("#locatario_nome");
    await expect(locatarioNome).toBeVisible({ timeout: 10000 });
    await locatarioNome.fill("Juliana Lima");
    await page.locator("#locatario_cpf").fill("555.666.777-88");
    await page.locator("#locatario_profissao").fill("Arquiteta");
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 2: Imóvel
    const imovelRua = page.locator("#imovel_rua");
    await expect(imovelRua).toBeVisible({ timeout: 10000 });
    await page.locator("#imovel_cep").fill("04538-133");
    await imovelRua.fill("Rua Funchal");
    await page.locator("#imovel_numero").fill("200");
    await page.locator("#imovel_bairro").fill("Vila Olímpia");
    await page.locator("#imovel_cidade").fill("São Paulo");
    await page.locator("#imovel_uf").fill("SP");
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 3: Valores e prazo
    const valorInput = page.locator("#valor");
    await expect(valorInput).toBeVisible({ timeout: 10000 });
    await valorInput.fill("3500,00");
    await page.locator("#prazo").fill("30");
    await page.locator("#dia_vencimento").fill("10");
    await page.locator("#forma_pagamento").fill("PIX");
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 4: Garantia locatícia (Cláusulas) - select "Fiador" clause and fill extras
    const fiadorCard = page.locator("div[role='checkbox']").filter({ hasText: /fiador/i }).first();
    await expect(fiadorCard).toBeVisible({ timeout: 10000 });
    await fiadorCard.click();

    // Fill extra fields for fiador
    const fiadorNomeInput = page.locator("#fiador_nome, input[id*='fiador_nome']").first();
    await expect(fiadorNomeInput).toBeVisible({ timeout: 5000 });
    await fiadorNomeInput.fill("Roberto Alcantara");

    const fiadorCpfInput = page.locator("#fiador_cpf, input[id*='fiador_cpf']").first();
    if (await fiadorCpfInput.isVisible()) {
      await fiadorCpfInput.fill("999.888.777-66");
    }

    // Finalize
    await page.getByRole("button", { name: /finalizar|gerar|avançar/i }).click();

    // Reaches SucessoView
    await page.waitForURL((url) => url.searchParams.get("view") === "sucesso", { timeout: 20000 });

    // Checkout
    const buyButton = page.getByRole("button", { name: /baixar por r\$|comprar|desbloquear/i }).first();
    await expect(buyButton).toBeVisible({ timeout: 10000 });
    await buyButton.click();

    await page.waitForURL((url) => url.searchParams.get("view") === "checkout", { timeout: 10000 });

    const emailInput = page.locator("input[type='email']").first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill("juliana.teste@docfacil.com");

    const payCta = page.getByRole("button", { name: /pagar/i }).first();
    await payCta.click();

    const termsCheckbox = page.locator("#consent-terms, input[id='consent-terms']").first();
    await expect(termsCheckbox).toBeVisible({ timeout: 5000 });
    await termsCheckbox.click();

    const privacyCheckbox = page.locator("#consent-privacy, input[id='consent-privacy']").first();
    await privacyCheckbox.click();

    const acceptConsentBtn = page.getByRole("button", { name: /aceitar e continuar/i }).first();
    await expect(acceptConsentBtn).toBeEnabled({ timeout: 5000 });
    await acceptConsentBtn.click();

    // Verify orderId preservation on return
    await page.waitForURL(
      (url) => {
        return (
          url.searchParams.get("view") === "sucesso" &&
          Boolean(url.searchParams.get("orderId"))
        );
      },
      { timeout: 25000 }
    );

    // Verify redirect to /d/<token>
    await page.waitForURL(/\/d\/[A-Za-z0-9_-]{20,}/, { timeout: 35000 });

    const downloadButton = page.getByRole("button", {
      name: /baixar documento|baixar pdf|download/i,
    }).first();
    await expect(downloadButton).toBeVisible({ timeout: 15000 });
  });
});
