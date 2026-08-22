import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";
import { fillDocumentUntilFinalization } from "./support/document-form";
import { mockCepLookup, waitForSearchParams } from "./support/navigation";

async function openAndFill(page: Page, slug: string) {
  await page.goto(`/?view=criar&slug=${slug}`);
  return fillDocumentUntilFinalization(page);
}

async function createFreeAccount(page: Page, testInfo: TestInfo) {
  await createAuthenticatedAccount(page, testInfo, {
    name: "Conta Free E2E",
  });
}

test.describe("Free entitlement E2E", () => {
  test.setTimeout(150000);

  test.beforeEach(async ({ page }) => {
    await mockCepLookup(page);
  });

  test("permite a primeira geração grátis e converte a segunda em paywall mensal", async ({
    page,
  }, testInfo) => {
    await createFreeAccount(page, testInfo);

    const firstFinalize = await openAndFill(page, "declaracao-residencia");
    const firstResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/documents/finalize"
    );
    await firstFinalize.click();
    const firstResponse = await firstResponsePromise;
    expect(firstResponse.status()).toBe(200);
    await waitForSearchParams(page, { view: "sucesso", id: null }, 45000);

    const secondFinalize = await openAndFill(page, "comodato");
    await secondFinalize.click();

    await expect(
      page.getByRole("heading", { name: "Geração grátis já utilizada", exact: true })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText("Sua geração gratuita deste mês já foi usada.", { exact: false })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Comprar documento avulso", exact: true })
    ).toBeVisible();
  });

  test("modelo não elegível abre paywall sem consumir a vaga grátis", async ({
    page,
  }, testInfo) => {
    await createFreeAccount(page, testInfo);

    const paidModelFinalize = await openAndFill(page, "declaracao-residencia-terceiro");
    await paidModelFinalize.click();

    await expect(
      page.getByRole("heading", { name: "Modelo fora da seleção grátis", exact: true })
    ).toBeVisible({ timeout: 15000 });

    const freeFinalize = await openAndFill(page, "declaracao-residencia");
    const freeResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/documents/finalize"
    );
    await freeFinalize.click();
    const freeResponse = await freeResponsePromise;

    expect(freeResponse.status()).toBe(200);
    await waitForSearchParams(page, { view: "sucesso", id: null }, 45000);
    await expect(
      page.getByText("Seu documento está pronto!", { exact: false })
    ).toBeVisible({ timeout: 15000 });
  });
});
