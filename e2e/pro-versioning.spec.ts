import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";
import { fillDocumentUntilFinalization } from "./support/document-form";
import { mockCepLookup, waitForSearchParams } from "./support/navigation";

const FREE_SLUG = "declaracao-residencia";

async function createAccount(page: Page, testInfo: TestInfo) {
  return createAuthenticatedAccount(page, testInfo, {
    name: "Versionamento Pro E2E",
  });
}

async function createFreeDocument(page: Page) {
  await page.goto(`/?view=criar&slug=${FREE_SLUG}`);
  const finalize = await fillDocumentUntilFinalization(page);

  const requestPromise = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/documents/finalize"
  );
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/documents/finalize"
  );

  await finalize.click();
  const [request, response] = await Promise.all([requestPromise, responsePromise]);
  expect(response.status()).toBe(200);

  const authorization = request.headers()["authorization"];
  expect(authorization).toMatch(/^Bearer\s+\S+/);

  const payload = await response.json();
  const documentId = payload.document?.id as string | undefined;
  expect(documentId).toBeTruthy();
  expect(payload.document?.version).toBe(1);

  await waitForSearchParams(
    page,
    { view: "sucesso", slug: FREE_SLUG, id: documentId! },
    45000
  );

  return { documentId: documentId!, authorization };
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

  const paywall = page.getByRole("dialog", {
    name: "Suas alterações estão prontas para gerar uma nova versão.",
  });
  await expect(paywall).toBeVisible({ timeout: 15000 });
  return paywall;
}

test.describe("Pro versioning E2E", () => {
  test.setTimeout(240000);

  test.beforeEach(async ({ page }) => {
    await mockCepLookup(page);
  });

  test("upgrade Pro preserva v1, cria v2 atual e remove watermark da nova versão", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);
    const { documentId, authorization } = await createFreeDocument(page);
    const paywall = await openVersionPaywall(page, documentId);

    await paywall.getByRole("button", { name: "Assinar Pro", exact: true }).click();
    await waitForSearchParams(page, {
      view: "checkout",
      plan: "pro",
      slug: FREE_SLUG,
      draftId: null,
    });

    await page.getByRole("button", { name: /Pagar.*39,90/i }).click();
    await waitForSearchParams(
      page,
      { view: "criar", slug: FREE_SLUG, draftId: null },
      45000
    );
    const draftId = new URL(page.url()).searchParams.get("draftId");
    expect(draftId).toBeTruthy();

    // O perfil deve refletir o upgrade sem logout/login nem manipulação manual da sessão.
    await page.goto("/?view=perfil");
    await expect(page.getByRole("heading", { name: "Plano Pro", exact: true })).toBeVisible({
      timeout: 15000,
    });

    await page.goto(`/?view=criar&slug=${FREE_SLUG}&draftId=${draftId}`);
    const finalizeVersion = await fillDocumentUntilFinalization(page);
    const versionResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/documents/${documentId}/versions`
    );
    await finalizeVersion.click();
    const versionResponse = await versionResponsePromise;
    expect(versionResponse.status()).toBe(200);

    const versionPayload = await versionResponse.json();
    expect(versionPayload.document?.id).toBe(documentId);
    expect(versionPayload.document?.version).toBe(2);

    const detailResponse = await page.request.get(`/api/documents/${documentId}`, {
      headers: { Authorization: authorization },
    });
    expect(detailResponse.status()).toBe(200);
    const detailPayload = await detailResponse.json();
    expect(detailPayload.document?.currentVersion).toBe(2);
    expect(detailPayload.document?.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ version: 1, watermarked: true }),
        expect.objectContaining({ version: 2, watermarked: false }),
      ])
    );

    const downloadV1 = await page.request.post(`/api/documents/${documentId}/download`, {
      headers: { Authorization: authorization },
      data: { version: 1 },
    });
    expect(downloadV1.status()).toBe(200);
    expect((await downloadV1.json()).version).toBe(1);

    const downloadV2 = await page.request.post(`/api/documents/${documentId}/download`, {
      headers: { Authorization: authorization },
      data: { version: 2 },
    });
    expect(downloadV2.status()).toBe(200);
    expect((await downloadV2.json()).version).toBe(2);
  });
});
