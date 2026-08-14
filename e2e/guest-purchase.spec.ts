import { test, expect } from "@playwright/test";

test.describe("Guest Purchase and Download Flow", () => {
  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  test("completes guest creation, checkout with orderId preservation, magic link generation and download", async ({
    page,
  }) => {
    // 1. Open model creation as guest
    await page.goto("/?view=criar&slug=declaracao-residencia");

    // Fill Stage 0 (Declarante + Endereço)
    const nameInput = page.locator("#g-declarante_nome");
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill("Maria da Silva");

    const nacSelect = page.locator("#g-declarante_nacionalidade");
    if (await nacSelect.isVisible()) await nacSelect.selectOption("Brasileiro(a)");

    const ecSelect = page.locator("#g-declarante_estado_civil");
    if (await ecSelect.isVisible()) await ecSelect.selectOption("Solteiro(a)");

    const profInput = page.locator("#g-declarante_profissao");
    if (await profInput.isVisible()) await profInput.fill("Engenheira");

    const cpfInput = page.locator("#g-declarante_cpf");
    if (await cpfInput.isVisible()) await cpfInput.fill("111.444.777-35");

    const cepInput = page.locator("#g-declarante_cep");
    if (await cepInput.isVisible()) await cepInput.fill("01310-100");

    const ruaInput = page.locator("#g-declarante_rua");
    if (await ruaInput.isVisible()) await ruaInput.fill("Av. Paulista");

    const numInput = page.locator("#g-declarante_numero");
    if (await numInput.isVisible()) await numInput.fill("1500");

    const bairroInput = page.locator("#g-declarante_bairro");
    if (await bairroInput.isVisible()) await bairroInput.fill("Bela Vista");

    const cidadeInput = page.locator("#g-declarante_cidade");
    if (await cidadeInput.isVisible()) await cidadeInput.fill("São Paulo");

    const ufInput = page.locator("#g-declarante_uf");
    if (await ufInput.isVisible()) await ufInput.fill("SP");

    // Advance to Stage 1 (Finalidade)
    await page.getByRole("button", { name: /^avançar$/i }).click();

    // Stage 1: Finalidade
    const finalidadeInput = page.locator("textarea");
    await expect(finalidadeInput.first()).toBeVisible({ timeout: 10000 });
    await finalidadeInput.first().fill("Comprovante para abertura de conta bancária");

    // Finalize creation
    await page.getByRole("button", { name: /finalizar/i }).click();

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
    const locadorNome = page.locator("#g-locador_nome");
    await expect(locadorNome).toBeVisible({ timeout: 15000 });
    await locadorNome.fill("Carlos Santos");
    const locadorNac = page.locator("#g-locador_nacionalidade");
    if (await locadorNac.isVisible()) await locadorNac.selectOption("Brasileiro(a)");
    const locadorEc = page.locator("#g-locador_estado_civil");
    if (await locadorEc.isVisible()) await locadorEc.selectOption("Solteiro(a)");
    const locadorProf = page.locator("#g-locador_profissao");
    if (await locadorProf.isVisible()) await locadorProf.fill("Empresário");
    const locadorCpf = page.locator("#g-locador_cpf");
    if (await locadorCpf.isVisible()) await locadorCpf.fill("111.444.777-35");
    await page.getByRole("button", { name: /^avançar$/i }).click();

    // Stage 1: Locatário
    const locatarioNome = page.locator("#g-locatario_nome");
    await expect(locatarioNome).toBeVisible({ timeout: 10000 });
    await locatarioNome.fill("Juliana Lima");
    const locatarioNac = page.locator("#g-locatario_nacionalidade");
    if (await locatarioNac.isVisible()) await locatarioNac.selectOption("Brasileiro(a)");
    const locatarioEc = page.locator("#g-locatario_estado_civil");
    if (await locatarioEc.isVisible()) await locatarioEc.selectOption("Solteiro(a)");
    const locatarioProf = page.locator("#g-locatario_profissao");
    if (await locatarioProf.isVisible()) await locatarioProf.fill("Arquiteta");
    const locatarioCpf = page.locator("#g-locatario_cpf");
    if (await locatarioCpf.isVisible()) await locatarioCpf.fill("529.982.247-25");
    await page.getByRole("button", { name: /^avançar$/i }).click();

    // Stage 2: Imóvel
    const imovelRua = page.locator("#g-imovel_rua");
    await expect(imovelRua).toBeVisible({ timeout: 10000 });
    const imovelCep = page.locator("#g-imovel_cep");
    if (await imovelCep.isVisible()) await imovelCep.fill("04538-133");
    await imovelRua.fill("Rua Funchal");
    const imovelNum = page.locator("#g-imovel_numero");
    if (await imovelNum.isVisible()) await imovelNum.fill("200");
    const imovelBairro = page.locator("#g-imovel_bairro");
    if (await imovelBairro.isVisible()) await imovelBairro.fill("Vila Olímpia");
    const imovelCidade = page.locator("#g-imovel_cidade");
    if (await imovelCidade.isVisible()) await imovelCidade.fill("São Paulo");
    const imovelUf = page.locator("#g-imovel_uf");
    if (await imovelUf.isVisible()) await imovelUf.fill("SP");
    await page.getByRole("button", { name: /^avançar$/i }).click();

    // Stage 3: Valores e prazo
    const valorInput = page.locator("#g-valor");
    await expect(valorInput).toBeVisible({ timeout: 10000 });
    await valorInput.fill("3500,00");
    const prazoInput = page.locator("#g-prazo");
    if (await prazoInput.isVisible()) await prazoInput.fill("30");
    const vencInput = page.locator("#g-dia_vencimento");
    if (await vencInput.isVisible()) await vencInput.fill("10");
    const formaInput = page.locator("#g-forma_pagamento");
    if (await formaInput.isVisible()) await formaInput.fill("PIX");
    await page.getByRole("button", { name: /^avançar$/i }).click();

    // Stage 4: Garantia locatícia (Cláusulas) - select "Fiador" clause and fill extras
    const fiadorCard = page.locator("div[role='checkbox']").filter({ hasText: /fiador/i }).first();
    await expect(fiadorCard).toBeVisible({ timeout: 10000 });
    await fiadorCard.click({ force: true });

    // Fill extra fields for fiador
    const fiadorNomeInput = page.locator("#cl-fiador-fiador_nome");
    await expect(fiadorNomeInput).toBeVisible({ timeout: 10000 });
    await fiadorNomeInput.fill("Roberto Alcantara");

    const fiadorCpfInput = page.locator("#cl-fiador-fiador_cpf");
    if (await fiadorCpfInput.isVisible()) {
      await fiadorCpfInput.fill("056.489.370-84");
    }

    // Finalize
    await page.getByRole("button", { name: /finalizar/i }).click();

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
