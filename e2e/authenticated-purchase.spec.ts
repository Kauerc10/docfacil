import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";
import { fillDocumentUntilFinalization } from "./support/document-form";
import { mockCepLookup, waitForSearchParams } from "./support/navigation";

const FREE_SLUG = "declaracao-residencia";
const PAID_SLUG = "declaracao-residencia-terceiro";

async function createAccount(page: Page, testInfo: TestInfo) {
  return createAuthenticatedAccount(page, testInfo, {
    name: "Compra Autenticada E2E",
  });
}

async function createFreeDocument(page: Page): Promise<string> {
  await page.goto(`/?view=criar&slug=${FREE_SLUG}`);
  const finalize = await fillDocumentUntilFinalization(page);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/documents/finalize"
  );

  await finalize.click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  const documentId = payload.document?.id as string | undefined;
  expect(documentId).toBeTruthy();
  await waitForSearchParams(
    page,
    { view: "sucesso", slug: FREE_SLUG, id: documentId! },
    45000
  );
  return documentId!;
}

async function openVersionPaywall(page: Page, documentId: string) {
  await page.goto(`/?view=criar&slug=${FREE_SLUG}&id=${documentId}`);
  const finalize = await fillDocumentUntilFinalization(page);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === `/api/documents/${documentId}/versions`
  );

  await finalize.click();
  const response = await responsePromise;
  expect(response.status()).toBe(402);

  const dialog = page.getByRole("dialog", {
    name: "Suas alterações estão prontas para gerar uma nova versão.",
  });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  return dialog;
}

test.describe("Authenticated single purchase E2E", () => {
  test.setTimeout(240000);

  test.beforeEach(async ({ page }) => {
    await mockCepLookup(page);
  });

  test("compra modelo pago autenticado sem repetir consentimento e salva na biblioteca", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);

    await page.goto(`/?view=criar&slug=${PAID_SLUG}`);
    const finalize = await fillDocumentUntilFinalization(page);
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
    await paywall
      .getByRole("button", { name: "Comprar documento avulso", exact: true })
      .click();

    await waitForSearchParams(page, {
      view: "checkout",
      plan: "avulso",
      slug: PAID_SLUG,
      draftId: null,
    });
    const draftId = new URL(page.url()).searchParams.get("draftId");
    expect(draftId).toBeTruthy();

    const finalizationResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/documents/finalize"
    );
    await page.getByRole("button", { name: /Gerar Pix de.*19,90/i }).click();

    await expect(page.locator("#consent-terms")).toHaveCount(0);

    const finalizationResponse = await finalizationResponsePromise;
    expect(finalizationResponse.status()).toBe(200);
    const payload = await finalizationResponse.json();
    const documentId = payload.document?.id as string | undefined;
    expect(documentId).toBeTruthy();
    expect(payload.document?.version).toBe(1);

    await waitForSearchParams(
      page,
      { view: "sucesso", slug: PAID_SLUG, id: documentId! },
      45000
    );

    await page.goto("/?view=dashboard");
    await expect(
      page.getByRole("button", {
        name: /Abrir Declaração de Residência por Terceiro, concluído/i,
      })
    ).toBeVisible({ timeout: 15000 });
  });

  test("compra nova versão avulsa e mantém o mesmo documento", async ({ page }, testInfo) => {
    await createAccount(page, testInfo);
    const documentId = await createFreeDocument(page);
    const paywall = await openVersionPaywall(page, documentId);

    await paywall
      .getByRole("button", { name: "Comprar documento avulso", exact: true })
      .click();
    await waitForSearchParams(page, {
      view: "checkout",
      plan: "avulso",
      slug: FREE_SLUG,
      draftId: null,
    });

    const versionResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/documents/${documentId}/versions`
    );
    await page.getByRole("button", { name: /Gerar Pix de.*19,90/i }).click();
    const versionResponse = await versionResponsePromise;
    expect(versionResponse.status()).toBe(200);

    const payload = await versionResponse.json();
    expect(payload.document?.id).toBe(documentId);
    expect(payload.document?.version).toBe(2);

    await waitForSearchParams(
      page,
      { view: "sucesso", slug: FREE_SLUG, id: documentId },
      45000
    );

    await page.goto("/?view=dashboard");
    const matchingCards = page.getByRole("button", {
      name: /Abrir Autodeclaração de Residência, concluído/i,
    });
    await expect(matchingCards).toHaveCount(1);
  });
});
