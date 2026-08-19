import { expect, test } from "@playwright/test";

test.describe("Document access product UX", () => {
  test("catalogo destaca somente a selecao gratuita mensal", async ({ page }) => {
    await page.goto("/?view=modelos");

    await expect(
      page.getByText("1 geração grátis por mês com uma conta DocFácil")
    ).toBeVisible();
    await expect(
      page.getByText("Grátis este mês", { exact: true })
    ).toHaveCount(3);

    for (const modelName of [
      "Declaração de Residência",
      "Contrato de Comodato",
      "Contrato de Locação Comercial",
    ]) {
      const card = page.getByRole("button", { name: new RegExp(modelName, "i") });
      await expect(card).toContainText("Grátis este mês");
    }
  });

  test("planos exibem nova quota e precos centralizados", async ({ page }) => {
    await page.goto("/?view=planos");

    await expect(page.getByText("1 geração grátis por mês")).toBeVisible();
    await expect(page.getByText("Conta DocFácil necessária")).toBeVisible();
    await expect(page.getByText("R$ 19,90")).toBeVisible();
    await expect(page.getByText("R$ 39,90")).toBeVisible();
    await expect(page.getByText(/modelos disponíveis gratuitamente podem mudar/i)).toBeVisible();
  });

  test("checkout avulso mantém compra sem conta e preço de R$ 19,90", async ({ page }) => {
    await page.goto("/?view=checkout&plan=avulso");

    await expect(page.getByRole("heading", { name: "Avulso" })).toBeVisible();
    await expect(page.getByText("R$ 19,90").first()).toBeVisible();
    await expect(page.getByLabel(/seu e-mail/i)).toBeVisible();
    await expect(page.getByText(/pagamento único/i).first()).toBeVisible();
  });
});
