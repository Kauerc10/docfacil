import { test, expect } from "@playwright/test";

test.describe("Landing comercial e fluxo de descoberta pública", () => {
  test.beforeEach(async ({ page }) => {
    // Pré-registra preferências de cookies para não bloquear cliques na interface
    await page.addInitScript(() => {
      localStorage.setItem(
        "docfacil:cookie-prefs",
        JSON.stringify({
          version: "1.1",
          essential: true,
          analytics: true,
          marketing: true,
        })
      );
    });
  });

  test("visita a home, encontra o documento no catálogo e inicia o preenchimento", async ({ page }) => {
    // 1. Acessa a home
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Documento difícil? Nunca mais." })
    ).toBeVisible();

    // Confere se o hero e os CTAs estão visíveis
    const ctaCatalogo = page.getByRole("link", { name: "Encontrar o documento certo" }).first();
    await expect(ctaCatalogo).toBeVisible();

    // 2. Clica para navegar ao catálogo
    await ctaCatalogo.click();
    await expect(page).toHaveURL(/\/documentos/);
    await expect(
      page.getByRole("heading", { name: "Qual documento você precisa resolver hoje?" })
    ).toBeVisible();

    // 3. Faz busca tolerante a acentos por "procuracao"
    const searchInput = page.getByPlaceholder("Ex.: aluguel, procuração, residência ou compra e venda");
    await searchInput.fill("procuracao");

    // Deve exibir o card da Procuração Simples
    const procuracaoCard = page.getByRole("heading", { name: "Procuração Simples" });
    await expect(procuracaoCard).toBeVisible();

    // 4. Acessa a página do modelo
    const verDetalhes = page
      .locator('article:has-text("Procuração Simples")')
      .getByRole("link", { name: /Ver detalhes/ });
    await expect(verDetalhes).toBeVisible();
    await verDetalhes.click();
    await expect(page).toHaveURL(/\/documentos\/procuracao-simples/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Procuração Simples", level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Quando usar este modelo")).toBeVisible();

    // 5. Inicia o preenchimento do documento
    const ctaPreencher = page.getByRole("link", { name: "Começar este documento" });
    await expect(ctaPreencher).toBeVisible();
    await ctaPreencher.click();

    // Confere se entrou no fluxo real de criação do documento
    await expect(page).toHaveURL(/\/\?view=criar&slug=procuracao-simples/, { timeout: 15000 });
  });

  test("menu mobile abre e fecha com tecla Escape", async ({ page }) => {
    // Define viewport mobile (390px - iPhone standard)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: "Abrir menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Confere se o menu abriu e tem o link de Documentos
    const docLink = page.getByRole("link", { name: "Documentos" }).first();
    await expect(docLink).toBeVisible();

    // Pressiona Escape para fechar
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
  });

  test("mantém compatibilidade com deep link antigo de modelo", async ({ page }) => {
    await page.goto("/?view=modelo-detalhe&slug=contrato-locacao");
    // Deve renderizar a visualização do modelo
    await expect(page.getByRole("heading", { name: "Contrato de Locação" }).first()).toBeVisible();
  });
});
