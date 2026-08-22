import { expect, test } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";

test.describe("Authenticated E2E session", () => {
  test("cadastro usa token real do Firebase nas APIs protegidas", async ({ page }, testInfo) => {
    await createAuthenticatedAccount(page, testInfo);

    await expect(
      page.getByRole("heading", { name: "Meus Documentos", exact: true })
    ).toBeVisible({ timeout: 10000 });
  });
});
