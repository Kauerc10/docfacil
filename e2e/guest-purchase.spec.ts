import { test, expect } from "@playwright/test";

test.describe("Guest Purchase and Download Flow", () => {
  test("completes guest creation, checkout with orderId preservation, magic link generation and download", async ({
    page,
  }) => {
    // 1. Open model creation as guest
    await page.goto("/?view=criar&slug=declaracao-residencia");

    // Fill Stage 0 (Declarante + Endereço)
    const nameInput = page.locator("input#declarante_nome").or(page.locator("input[placeholder*='Maria']")).first();
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill("Maria da Silva");

    const cpfInput = page.locator("input#declarante_cpf").or(page.locator("input[placeholder*='123.456.789-00']")).first();
    if (await cpfInput.isVisible()) await cpfInput.fill("123.456.789-00");

    const profInput = page.locator("input#declarante_profissao").or(page.locator("input[placeholder*='Comerciante']")).first();
    if (await profInput.isVisible()) await profInput.fill("Engenheira");

    const cepInput = page.locator("input#declarante_cep").or(page.locator("input[placeholder*='01234-567']")).first();
    if (await cepInput.isVisible()) await cepInput.fill("01310-100");

    const ruaInput = page.locator("input#declarante_rua").or(page.locator("input[placeholder*='das Flores']")).first();
    if (await ruaInput.isVisible()) await ruaInput.fill("Av. Paulista");

    const numInput = page.locator("input#declarante_numero").or(page.locator("input[placeholder*='123']")).first();
    if (await numInput.isVisible()) await numInput.fill("1500");

    const bairroInput = page.locator("input#declarante_bairro").or(page.locator("input[placeholder*='Centro']")).first();
    if (await bairroInput.isVisible()) await bairroInput.fill("Bela Vista");

    const cidadeInput = page.locator("input#declarante_cidade").or(page.locator("input[placeholder*='São Paulo']")).first();
    if (await cidadeInput.isVisible()) await cidadeInput.fill("São Paulo");

    const ufInput = page.locator("input#declarante_uf").or(page.locator("input[placeholder*='SP']")).first();
    if (await ufInput.isVisible()) await ufInput.fill("SP");

    // Advance to Stage 1 (Finalidade)
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 1: Finalidade
    const finalidadeInput = page.locator("textarea#finalidade").or(page.locator("textarea[placeholder*='Comprovante']")).first();
    await expect(finalidadeInput).toBeVisible({ timeout: 10000 });
    await finalidadeInput.fill("Comprovante para abertura de conta bancária");

    const cidadeDataInput = page.locator("input#cidade_data").or(page.locator("input[placeholder*='São Paulo']")).first();
    if (await cidadeDataInput.isVisible()) {
      await cidadeDataInput.fill("São Paulo, 14 de agosto de 2026");
    }

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
    const locadorNome = page.locator("input#locador_nome").or(page.locator("input[placeholder*='Maria']")).first();
    await expect(locadorNome).toBeVisible({ timeout: 15000 });
    await locadorNome.fill("Carlos Santos");
    const locadorCpf = page.locator("input#locador_cpf").or(page.locator("input[placeholder*='123.456.789-00']")).first();
    if (await locadorCpf.isVisible()) await locadorCpf.fill("111.222.333-44");
    const locadorProf = page.locator("input#locador_profissao").or(page.locator("input[placeholder*='Comerciante']")).first();
    if (await locadorProf.isVisible()) await locadorProf.fill("Empresário");
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 1: Locatário
    const locatarioNome = page.locator("input#locatario_nome").or(page.locator("input[placeholder*='Maria']")).first();
    await expect(locatarioNome).toBeVisible({ timeout: 10000 });
    await locatarioNome.fill("Juliana Lima");
    const locatarioCpf = page.locator("input#locatario_cpf").or(page.locator("input[placeholder*='123.456.789-00']")).first();
    if (await locatarioCpf.isVisible()) await locatarioCpf.fill("555.666.777-88");
    const locatarioProf = page.locator("input#locatario_profissao").or(page.locator("input[placeholder*='Comerciante']")).first();
    if (await locatarioProf.isVisible()) await locatarioProf.fill("Arquiteta");
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 2: Imóvel
    const imovelRua = page.locator("input#imovel_rua").or(page.locator("input[placeholder*='das Flores']")).first();
    await expect(imovelRua).toBeVisible({ timeout: 10000 });
    const imovelCep = page.locator("input#imovel_cep").or(page.locator("input[placeholder*='01234-567']")).first();
    if (await imovelCep.isVisible()) await imovelCep.fill("04538-133");
    await imovelRua.fill("Rua Funchal");
    const imovelNum = page.locator("input#imovel_numero").or(page.locator("input[placeholder*='123']")).first();
    if (await imovelNum.isVisible()) await imovelNum.fill("200");
    const imovelBairro = page.locator("input#imovel_bairro").or(page.locator("input[placeholder*='Centro']")).first();
    if (await imovelBairro.isVisible()) await imovelBairro.fill("Vila Olímpia");
    const imovelCidade = page.locator("input#imovel_cidade").or(page.locator("input[placeholder*='São Paulo']")).first();
    if (await imovelCidade.isVisible()) await imovelCidade.fill("São Paulo");
    const imovelUf = page.locator("input#imovel_uf").or(page.locator("input[placeholder*='SP']")).first();
    if (await imovelUf.isVisible()) await imovelUf.fill("SP");
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 3: Valores e prazo
    const valorInput = page.locator("input#valor").or(page.locator("input[placeholder*='1.450,00']")).first();
    await expect(valorInput).toBeVisible({ timeout: 10000 });
    await valorInput.fill("3500,00");
    const prazoInput = page.locator("input#prazo").or(page.locator("input[placeholder*='30']")).first();
    if (await prazoInput.isVisible()) await prazoInput.fill("30");
    const vencInput = page.locator("input#dia_vencimento").or(page.locator("input[placeholder*='5']")).first();
    if (await vencInput.isVisible()) await vencInput.fill("10");
    const formaInput = page.locator("input#forma_pagamento").or(page.locator("input[placeholder*='PIX']")).first();
    if (await formaInput.isVisible()) await formaInput.fill("PIX");
    await page.getByRole("button", { name: /avançar|continuar/i }).click();

    // Stage 4: Garantia locatícia (Cláusulas) - select "Fiador" clause and fill extras
    const fiadorCard = page.locator("div[role='checkbox']").filter({ hasText: /fiador/i }).first();
    await expect(fiadorCard).toBeVisible({ timeout: 10000 });
    await fiadorCard.click();

    // Fill extra fields for fiador
    const fiadorNomeInput = page.locator("input#fiador_nome").or(page.locator("input[placeholder*='José Santos']")).first();
    await expect(fiadorNomeInput).toBeVisible({ timeout: 5000 });
    await fiadorNomeInput.fill("Roberto Alcantara");

    const fiadorCpfInput = page.locator("input#fiador_cpf").or(page.locator("input[placeholder*='123.456.789-00']")).first();
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
