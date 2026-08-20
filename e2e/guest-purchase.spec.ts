import { test, expect } from "@playwright/test";

/**
 * Aguarda a URL conter todos os searchParams esperados.
 *
 * - Usa page.waitForURL com um predicate — funciona para:
 *   a) history.pushState (SPA)
 *   b) window.location.href / window.location.assign (navegação real)
 * - waitUntil:"commit" dispara assim que a URL muda, sem aguardar load.
 *   Isso evita falsos timeouts em SPAs onde o evento "load" nunca dispara.
 */
async function waitForSearchParams(
  page: import("@playwright/test").Page,
  checks: Record<string, string | null>,
  timeout = 40000
) {
  await page.waitForURL(
    (url) => {
      const sp = url.searchParams;
      return Object.entries(checks).every(([k, v]) =>
        v === null ? sp.has(k) : sp.get(k) === v
      );
    },
    { waitUntil: "commit", timeout }
  );
}

async function acceptOptionalCookies(page: import("@playwright/test").Page) {
  const acceptAll = page.getByRole("button", { name: "Aceitar todos", exact: true });
  const visible = await acceptAll.isVisible({ timeout: 3000 }).catch(() => false);
  if (!visible) return;

  await acceptAll.click();
  await expect(
    page.getByRole("dialog", { name: "Consentimento de cookies" })
  ).toBeHidden({ timeout: 5000 });
}

test.describe("Guest Purchase and Download Flow", () => {
  test.setTimeout(120000);

  test("completes guest creation, checkout with orderId preservation, magic link generation and download", async ({
    page,
  }) => {
    // 1. Abre modelo de criação como guest
    await page.goto("/?view=criar&slug=declaracao-residencia");
    await acceptOptionalCookies(page);

    // Stage 0 — Declarante + Endereço
    const nameInput = page.locator("#g-declarante_nome");
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill("Maria da Silva");

    const nacSelect = page.locator("#g-declarante_nacionalidade");
    if (await nacSelect.isVisible()) await nacSelect.selectOption("Brasileiro(a)");

    const ecSelect = page.locator("#g-declarante_estado_civil");
    if (await ecSelect.isVisible()) await ecSelect.selectOption("solteiro(a)");

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

    // Stage 1 — Finalidade
    await page.getByRole("button", { name: /^avançar$/i }).click();
    const finalidadeInput = page.locator("textarea").first();
    await expect(finalidadeInput).toBeVisible({ timeout: 10000 });
    await finalidadeInput.fill("Comprovante para abertura de conta bancária");

    // Finaliza criação → SPA navega para ?view=sucesso
    await page.getByRole("button", { name: /finalizar/i }).click();
    await waitForSearchParams(page, { view: "sucesso" });

    // 2. Clica em comprar (PaymentBarrier)
    const buyButton = page
      .getByRole("button", { name: /baixar por r\$|comprar|desbloquear/i })
      .first();
    await expect(buyButton).toBeVisible({ timeout: 10000 });
    await buyButton.click();

    // SPA navega para ?view=checkout
    await waitForSearchParams(page, { view: "checkout" });

    // 3. Preenche e-mail guest
    const emailInput = page.locator("input[type='email']").first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill("maria.teste@docfacil.com");

    // 4. Clica em pagar → abre modal de consentimento
    const payCta = page.getByRole("button", { name: /pagar/i }).first();
    await payCta.click();

    const termsCheckbox = page.locator("#consent-terms").first();
    await expect(termsCheckbox).toBeVisible({ timeout: 8000 });
    await termsCheckbox.click();

    const privacyCheckbox = page.locator("#consent-privacy").first();
    await privacyCheckbox.click();

    const acceptConsentBtn = page.getByRole("button", { name: /aceitar e continuar/i }).first();
    await expect(acceptConsentBtn).toBeEnabled({ timeout: 5000 });
    await acceptConsentBtn.click();

    // 5. Após consentimento, CheckoutView chama createCheckout e faz:
    //    window.location.href = "/?view=sucesso&slug=...&orderId=<id>"
    //    (navegação REAL — waitForSearchParams usa waitForURL com "commit")
    await waitForSearchParams(page, { view: "sucesso", orderId: null }, 45000);

    // 6. SucessoView detecta orderId → finalizeDocument() → window.location.assign("/d/<token>")
    //    (navegação REAL)
    await page.waitForURL(/\/d\/[A-Za-z0-9_-]{20,}/, {
      timeout: 45000,
      waitUntil: "domcontentloaded",
    });

    // 7. Na página /d/<token> o botão de download deve estar visível
    const downloadButton = page
      .getByRole("button", { name: /^baixar\s/i })
      .first();
    await expect(downloadButton).toBeVisible({ timeout: 15000 });
  });

  test("completes guest creation with dynamic clause extras, checkout, magic link and download", async ({
    page,
  }) => {
    // 1. Abre modelo com cláusulas dinâmicas
    await page.goto("/?view=criar&slug=contrato-locacao");
    await acceptOptionalCookies(page);

    // Stage 0 — Locador
    const locadorNome = page.locator("#g-locador_nome");
    await expect(locadorNome).toBeVisible({ timeout: 15000 });
    await locadorNome.fill("Carlos Santos");
    const locadorNac = page.locator("#g-locador_nacionalidade");
    if (await locadorNac.isVisible()) await locadorNac.selectOption("Brasileiro(a)");
    const locadorEc = page.locator("#g-locador_estado_civil");
    if (await locadorEc.isVisible()) await locadorEc.selectOption("solteiro(a)");
    const locadorProf = page.locator("#g-locador_profissao");
    if (await locadorProf.isVisible()) await locadorProf.fill("Empresário");
    const locadorCpf = page.locator("#g-locador_cpf");
    if (await locadorCpf.isVisible()) await locadorCpf.fill("111.444.777-35");
    await page.getByRole("button", { name: /^avançar$/i }).click();

    // Stage 1 — Locatário
    const locatarioNome = page.locator("#g-locatario_nome");
    await expect(locatarioNome).toBeVisible({ timeout: 10000 });
    await locatarioNome.fill("Juliana Lima");
    const locatarioNac = page.locator("#g-locatario_nacionalidade");
    if (await locatarioNac.isVisible()) await locatarioNac.selectOption("Brasileiro(a)");
    const locatarioEc = page.locator("#g-locatario_estado_civil");
    if (await locatarioEc.isVisible()) await locatarioEc.selectOption("solteiro(a)");
    const locatarioProf = page.locator("#g-locatario_profissao");
    if (await locatarioProf.isVisible()) await locatarioProf.fill("Arquiteta");
    const locatarioCpf = page.locator("#g-locatario_cpf");
    if (await locatarioCpf.isVisible()) await locatarioCpf.fill("529.982.247-25");
    await page.getByRole("button", { name: /^avançar$/i }).click();

    // Stage 2 — Imóvel
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

    // Stage 3 — Valores e prazo
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

    // Stage 4 — Garantia locatícia: escolha única, seleciona Fiador
    const fiadorCard = page.getByRole("radio", { name: "Fiador", exact: true });
    await expect(fiadorCard).toBeVisible({ timeout: 10000 });
    await fiadorCard.click();
    await expect(fiadorCard).toHaveAttribute("aria-checked", "true", { timeout: 5000 });

    // Campos extras do fiador: ID = extra-{clausulaId}-{campo.key}
    // clausulaId = "fiador", campo.key = "fiador_nome"
    const fiadorNomeInput = page.locator("#extra-fiador-fiador_nome");
    await expect(fiadorNomeInput).toBeVisible({ timeout: 10000 });
    await fiadorNomeInput.fill("Roberto Alcantara");

    const fiadorCpfInput = page.locator("#extra-fiador-fiador_cpf");
    if (await fiadorCpfInput.isVisible()) {
      await fiadorCpfInput.fill("056.489.370-84");
    }

    // Stage 4 concluída: segue para as condições adicionais.
    await page.getByRole("button", { name: /^avançar$/i }).click();

    // Stage 5 — Condições adicionais: pode seguir sem selecionar cláusulas opcionais.
    await expect(page.getByText("Condições adicionais (opcionais)")).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /^avançar$/i }).click();

    // Finaliza → ?view=sucesso (SPA)
    await page.getByRole("button", { name: /finalizar/i }).click();
    await waitForSearchParams(page, { view: "sucesso" });

    // 2. Checkout
    const buyButton = page
      .getByRole("button", { name: /baixar por r\$|comprar|desbloquear/i })
      .first();
    await expect(buyButton).toBeVisible({ timeout: 10000 });
    await buyButton.click();
    await waitForSearchParams(page, { view: "checkout" });

    const emailInput = page.locator("input[type='email']").first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill("juliana.teste@docfacil.com");

    const payCta = page.getByRole("button", { name: /pagar/i }).first();
    await payCta.click();

    const termsCheckbox = page.locator("#consent-terms").first();
    await expect(termsCheckbox).toBeVisible({ timeout: 8000 });
    await termsCheckbox.click();

    const privacyCheckbox = page.locator("#consent-privacy").first();
    await privacyCheckbox.click();

    const acceptConsentBtn = page
      .getByRole("button", { name: /aceitar e continuar/i })
      .first();
    await expect(acceptConsentBtn).toBeEnabled({ timeout: 5000 });
    await acceptConsentBtn.click();

    // Checkout → ?view=sucesso&orderId=... (navegação REAL via window.location.href)
    await waitForSearchParams(page, { view: "sucesso", orderId: null }, 45000);

    // SucessoView → /d/<token> (navegação REAL via window.location.assign)
    await page.waitForURL(/\/d\/[A-Za-z0-9_-]{20,}/, {
      timeout: 45000,
      waitUntil: "domcontentloaded",
    });

    // Na página /d/<token> o botão tem texto "Baixar {filename}"
    const downloadButton = page
      .getByRole("button", { name: /^baixar\s/i })
      .first();
    await expect(downloadButton).toBeVisible({ timeout: 15000 });
  });
});
