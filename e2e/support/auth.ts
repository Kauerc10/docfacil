import { expect, type Page, type TestInfo } from "@playwright/test";

export interface AuthenticatedAccount {
  name: string;
  email: string;
  password: string;
}

function uniqueEmail(testInfo: TestInfo, prefix = "e2e") {
  const safeTitle = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${prefix}-${testInfo.workerIndex}-${Date.now()}-${safeTitle}@example.test`;
}

export async function createAuthenticatedAccount(
  page: Page,
  testInfo: TestInfo,
  overrides: Partial<AuthenticatedAccount> = {}
): Promise<AuthenticatedAccount> {
  const account: AuthenticatedAccount = {
    name: overrides.name ?? "Pessoa E2E",
    email: overrides.email ?? uniqueEmail(testInfo),
    password: overrides.password ?? "DocFacil-E2E-2026!",
  };

  await page.goto("/?view=cadastro");
  await page.getByLabel("Nome completo").fill(account.name);
  await page.getByLabel("E-mail").fill(account.email);
  await page.getByLabel("Senha", { exact: true }).fill(account.password);
  await page.getByLabel("Confirmar senha").fill(account.password);
  await page.locator("#cad-terms").check();

  const authenticatedConsentRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/consents") &&
      request.method() === "POST" &&
      /^Bearer\s+\S+/.test(request.headers()["authorization"] ?? ""),
    { timeout: 15000 }
  );

  await page.getByRole("button", { name: "Criar conta" }).click();
  await authenticatedConsentRequest;

  await expect(page).toHaveURL(/(?:\?|&)view=dashboard(?:&|$)/, {
    timeout: 15000,
  });

  return account;
}
