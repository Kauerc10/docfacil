import { test, expect } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";
import { fillDocumentUntilFinalization } from "./support/document-form";
import { mockCepLookup, waitForSearchParams } from "./support/navigation";

const PAID_SLUG = "declaracao-residencia-terceiro";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        })),
      { timeout: 10000 }
    )
    .toMatchObject({ clientWidth: 390 });

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe("Mobile critical flow E2E", () => {
  test.setTimeout(240000);
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await mockCepLookup(page);
  });

  test("criação → paywall → checkout → sucesso cabe na viewport e mantém CTAs acessíveis", async ({
    page,
  }, testInfo) => {
    await createAuthenticatedAccount(page, testInfo, {
      name: "Mobile E2E",
    });

    await page.goto(`/?view=criar&slug=${PAID_SLUG}`);
    await expectNoHorizontalOverflow(page);

    const finalize = await fillDocumentUntilFinalization(page);
    await expect(finalize).toBeVisible();
    await expect(finalize).toBeEnabled();
    await finalize.scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(page);

    const blockedResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/documents/finalize"
    );
    await finalize.click();
    const blockedResponse = await blockedResponsePromise;
    expect(blockedResponse.status()).toBe(402);

    const paywall = page.getByRole("dialog", {
      name: /não está entre os modelos gratuitos deste mês\./i,
    });
    await expect(paywall).toBeVisible({ timeout: 15000 });
    await expectNoHorizontalOverflow(page);

    const purchase = paywall.getByRole("button", {
      name: "Comprar documento avulso",
      exact: true,
    });
    await expect(purchase).toBeVisible();
    await expect(purchase).toBeEnabled();
    await purchase.click();

    await waitForSearchParams(page, {
      view: "checkout",
      plan: "avulso",
      slug: PAID_SLUG,
      draftId: null,
    });
    await expectNoHorizontalOverflow(page);

    const pay = page.getByRole("button", { name: /Gerar Pix de.*19,90/i });
    await expect(pay).toBeVisible({ timeout: 15000 });
    await expect(pay).toBeEnabled();

    const finalizationResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/documents/finalize"
    );
    await pay.click();
    const finalizationResponse = await finalizationResponsePromise;
    expect(finalizationResponse.status()).toBe(200);

    const payload = await finalizationResponse.json();
    const documentId = payload.document?.id as string | undefined;
    expect(documentId).toBeTruthy();
    await waitForSearchParams(
      page,
      { view: "sucesso", slug: PAID_SLUG, id: documentId! },
      45000
    );

    const successCta = page.locator("[data-suc='cta']");
    await expect(successCta).toBeVisible({ timeout: 15000 });
    await expect(successCta).toBeEnabled();
    await successCta.scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(page);
  });
});
