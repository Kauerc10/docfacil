import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";
import {
  fillCurrentDocumentStep,
  fillDocumentUntilFinalization,
} from "./support/document-form";
import { mockCepLookup, waitForSearchParams } from "./support/navigation";

const FREE_SLUG = "declaracao-residencia";

async function createAccount(page: Page, testInfo: TestInfo) {
  return createAuthenticatedAccount(page, testInfo, {
    name: "Rascunhos E2E",
  });
}

async function captureAuthorization(page: Page): Promise<string> {
  const requestPromise = page.waitForRequest(
    (request) =>
      request.method() === "GET" &&
      new URL(request.url()).pathname === "/api/documents" &&
      /^Bearer\s+\S+/.test(request.headers()["authorization"] ?? ""),
    { timeout: 15000 }
  );
  await page.goto("/?view=dashboard");
  const request = await requestPromise;
  return request.headers()["authorization"]!;
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
  const payload = await response.json();
  const documentId = payload.document?.id as string | undefined;
  expect(documentId).toBeTruthy();
  await waitForSearchParams(
    page,
    { view: "sucesso", slug: FREE_SLUG, id: documentId! },
    45000
  );

  return {
    documentId: documentId!,
    authorization: request.headers()["authorization"],
  };
}

test.describe("Drafts and library E2E", () => {
  test.setTimeout(240000);

  test.beforeEach(async ({ page }) => {
    await mockCepLookup(page);
  });

  test("persiste rascunho parcial autenticado e retoma valores pela biblioteca", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);
    const authorization = await captureAuthorization(page);

    await page.goto(`/?view=criar&slug=${FREE_SLUG}`);
    await fillCurrentDocumentStep(page, {
      fieldValues: { declarante_nome: "Marina de Souza Oliveira" },
    });
    const firstControl = page.locator("input:visible, select:visible, textarea:visible").first();
    const savedValue = await firstControl.inputValue();
    expect(savedValue).toBe("Marina de Souza Oliveira");

    const draftSave = await page.request.post("/api/drafts", {
      headers: { Authorization: authorization },
      data: {
        modeloSlug: FREE_SLUG,
        respostas: { declarante_nome: savedValue },
        stepIndex: 0,
        clausulasSelecionadas: [],
        extrasPorClausula: {},
      },
    });
    expect(draftSave.status()).toBe(200);
    const draftPayload = await draftSave.json();
    const draftId = draftPayload.draft?.id as string | undefined;
    expect(draftId).toBeTruthy();
    expect(draftPayload.draft?.respostas?.declarante_nome).toBe(savedValue);

    await page.goto("/?view=dashboard");
    const draftCard = page.getByRole("button", {
      name: /Abrir Autodeclaração de Residência, rascunho/i,
    });
    await expect(draftCard).toBeVisible({ timeout: 15000 });
    await draftCard.click();
    await waitForSearchParams(page, {
      view: "criar",
      slug: FREE_SLUG,
      draftId: draftId!,
    });

    await expect(page.locator("input:visible, select:visible, textarea:visible").first()).toHaveValue(savedValue);

    const finalize = await fillDocumentUntilFinalization(page);
    const finalResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/documents/finalize"
    );
    await finalize.click();
    const finalResponse = await finalResponsePromise;
    expect(finalResponse.status()).toBe(200);
  });

  test("duplicação cria rascunho independente sem gerar novo documento final", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);
    const { documentId, authorization } = await createFreeDocument(page);
    expect(authorization).toMatch(/^Bearer\s+\S+/);

    const before = await page.request.get("/api/documents", {
      headers: { Authorization: authorization! },
    });
    expect(before.status()).toBe(200);
    expect((await before.json()).documents).toHaveLength(1);

    await page.goto("/?view=dashboard");
    const draftSavePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/drafts"
    );
    await page
      .getByRole("button", { name: "Duplicar Autodeclaração de Residência", exact: true })
      .click();
    const draftSave = await draftSavePromise;
    expect(draftSave.status()).toBe(200);
    const duplicatedDraft = (await draftSave.json()).draft as {
      id: string;
      sourceDocumentId?: string;
      respostas: Record<string, string>;
    };

    expect(duplicatedDraft.id).toBeTruthy();
    expect(duplicatedDraft.sourceDocumentId).toBeUndefined();
    expect(Object.keys(duplicatedDraft.respostas).length).toBeGreaterThan(0);

    await waitForSearchParams(page, {
      view: "criar",
      slug: FREE_SLUG,
      draftId: duplicatedDraft.id,
    });
    await expect(page.locator("input:visible, select:visible, textarea:visible").first()).not.toHaveValue("");

    const after = await page.request.get("/api/documents", {
      headers: { Authorization: authorization! },
    });
    expect(after.status()).toBe(200);
    const afterDocuments = (await after.json()).documents as Array<{ id: string }>;
    expect(afterDocuments).toHaveLength(1);
    expect(afterDocuments[0]?.id).toBe(documentId);
  });
});
