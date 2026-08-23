import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";
import { fillDocumentUntilFinalization } from "./support/document-form";
import { mockCepLookup, waitForSearchParams } from "./support/navigation";

const FREE_SLUG = "declaracao-residencia";
const PAID_SLUG = "declaracao-residencia-terceiro";

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
  await waitForSearchParams(page, { view: "sucesso", slug: FREE_SLUG, id: documentId! }, 45000);
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

async function createAccount(page: Page, testInfo: TestInfo) {
  return createAuthenticatedAccount(page, testInfo, {
    name: "Conta Lifecycle E2E",
  });
}

test.describe("Authenticated document lifecycle E2E", () => {
  test.setTimeout(240000);

  test.beforeEach(async ({ page }) => {
    await mockCepLookup(page);
  });

  test("salva rascunho autenticado no paywall e retoma respostas pelo dashboard", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);

    await page.goto(`/?view=criar&slug=${PAID_SLUG}`);
    const finalize = await fillDocumentUntilFinalization(page);
    await finalize.click();

    const paywall = page.getByRole("dialog", {
      name: /não está entre os modelos gratuitos deste mês\./i,
    });
    await expect(paywall).toBeVisible({ timeout: 15000 });
    await paywall.getByRole("button", { name: "Salvar como rascunho", exact: true }).click();
    await expect(paywall).toBeHidden({ timeout: 10000 });

    const draftsResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname === "/api/drafts"
    );
    await page.goto("/?view=dashboard");
    const draftsResponse = await draftsResponsePromise;
    expect(draftsResponse.status()).toBe(200);

    const draftsPayload = await draftsResponse.json();
    expect(draftsPayload.drafts).toHaveLength(1);
    const draft = draftsPayload.drafts[0] as {
      id: string;
      modeloSlug: string;
      respostas: Record<string, string>;
    };
    expect(draft.modeloSlug).toBe(PAID_SLUG);
    expect(Object.keys(draft.respostas).length).toBeGreaterThan(0);

    const draftCard = page.getByRole("button", {
      name: /Abrir Declaração de Residência por Terceiro, rascunho/i,
    });
    await expect(draftCard).toBeVisible({ timeout: 15000 });
    await draftCard.click();
    await waitForSearchParams(
      page,
      { view: "criar", slug: PAID_SLUG, draftId: draft.id },
      30000
    );

    await expect(
      page.getByRole("progressbar", { name: "Progresso do documento" })
    ).toBeVisible({ timeout: 15000 });
  });

  test("usuário free compra uma nova versão avulsa e mantém o mesmo documento", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);
    const documentId = await createFreeDocument(page);
    const paywall = await openVersionPaywall(page, documentId);

    await paywall
      .getByRole("button", { name: "Comprar documento avulso", exact: true })
      .click();
    await waitForSearchParams(
      page,
      { view: "checkout", plan: "avulso", slug: FREE_SLUG, draftId: null },
      30000
    );

    const versionResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/documents/${documentId}/versions`
    );
    await page.getByRole("button", { name: /Pagar.*19,90/i }).click();
    const versionResponse = await versionResponsePromise;
    expect(versionResponse.status()).toBe(200);
    const versionPayload = await versionResponse.json();
    expect(versionPayload.document?.id).toBe(documentId);
    expect(versionPayload.document?.version).toBe(2);

    await waitForSearchParams(
      page,
      { view: "sucesso", slug: FREE_SLUG, id: documentId },
      45000
    );
  });

  test("ativa Pro no checkout demo, cria v2 e libera modelo fora da seleção grátis", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);
    const documentId = await createFreeDocument(page);
    const paywall = await openVersionPaywall(page, documentId);

    await paywall.getByRole("button", { name: "Assinar Pro", exact: true }).click();
    await waitForSearchParams(
      page,
      { view: "checkout", plan: "pro", slug: FREE_SLUG, draftId: null },
      30000
    );

    await page.getByRole("button", { name: /Pagar.*39,90/i }).click();
    await waitForSearchParams(
      page,
      { view: "criar", slug: FREE_SLUG, draftId: null },
      45000
    );
    const draftId = new URL(page.url()).searchParams.get("draftId");
    expect(draftId).toBeTruthy();

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

    await page.goto(`/?view=criar&slug=${PAID_SLUG}`);
    const paidModelFinalize = await fillDocumentUntilFinalization(page);
    const paidModelResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/documents/finalize"
    );
    await paidModelFinalize.click();
    const paidModelResponse = await paidModelResponsePromise;
    expect(paidModelResponse.status()).toBe(200);
  });

  test("dashboard baixa o documento pelo endpoint seguro real", async ({ page }, testInfo) => {
    await createAccount(page, testInfo);
    const documentId = await createFreeDocument(page);

    await page.goto("/?view=dashboard");
    const downloadButton = page.getByRole("button", {
      name: "Baixar PDF de Autodeclaração de Residência",
      exact: true,
    });
    await expect(downloadButton).toBeVisible({ timeout: 15000 });

    const downloadResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/documents/${documentId}/download`
    );
    await downloadButton.click();
    const downloadResponse = await downloadResponsePromise;
    expect(downloadResponse.status()).toBe(200);
  });
});
