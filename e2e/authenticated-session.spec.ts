import { expect, test } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";

test.describe("Authenticated E2E session", () => {
  test("cadastro usa token real do Firebase nas APIs protegidas", async ({ page }, testInfo) => {
    const account = await createAuthenticatedAccount(page, testInfo);

    await expect(page.getByText(account.name, { exact: false }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
