import { expect, test } from "@playwright/test";

test.describe("Password Recovery UX", () => {
  test("abre a recuperação a partir do login e confirma envio com feedback neutro", async ({
    page,
  }) => {
    await page.goto("/?view=login");

    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page).toHaveURL(/\/esqueci-senha$/);
    await expect(
      page.getByRole("heading", { name: "Esqueceu sua senha?" })
    ).toBeVisible();

    await page.getByLabel("E-mail").fill("teste@example.com");
    await page.getByRole("button", { name: "Enviar instruções" }).click();

    await expect(
      page.getByRole("heading", { name: "Confira seu e-mail" })
    ).toBeVisible();
    await expect(
      page.getByText(
        "Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir sua senha."
      )
    ).toBeVisible();
    await expect(page.getByText("te***@example.com")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Reenviar em 4\ds/ })
    ).toBeDisabled();
  });

  test("mostra estado amigável quando o link de redefinição não é válido", async ({
    page,
  }) => {
    await page.goto("/redefinir-senha");

    await expect(
      page.getByRole("heading", { name: "Esse link não é mais válido" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Solicitar novo link" })
    ).toHaveAttribute("href", "/esqueci-senha");

    await expect(page.getByText(/oobCode|Firebase|apiKey/i)).toHaveCount(0);
  });
});
