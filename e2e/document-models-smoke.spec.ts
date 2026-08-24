import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";
import { fillDocumentUntilFinalization } from "./support/document-form";
import { mockCepLookup, waitForSearchParams } from "./support/navigation";
import {
  OFFICIAL_MODEL_FIXTURES,
  OFFICIAL_MODEL_SLUGS,
} from "./support/model-fixtures";

async function createAccount(page: Page, testInfo: TestInfo) {
  return createAuthenticatedAccount(page, testInfo, {
    name: "Smoke Modelos E2E",
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

async function activatePro(page: Page, authorization: string) {
  const response = await page.request.post("/api/checkout/demo", {
    headers: { Authorization: authorization },
    data: { product: "pro", autoPay: true },
  });
  expect(response.status()).toBe(200);

  await page.goto("/?view=perfil");
  await expect(page.getByRole("heading", { name: "Plano Pro", exact: true })).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Official document models smoke E2E", () => {
  test.setTimeout(600000);

  test.beforeEach(async ({ page }) => {
    await mockCepLookup(page);
  });

  test("os nove modelos percorrem a UI, geram PDF e não deixam placeholders", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);
    const authorization = await captureAuthorization(page);
    await activatePro(page, authorization);

    for (const slug of OFFICIAL_MODEL_SLUGS) {
      await test.step(slug, async () => {
        const fixture = OFFICIAL_MODEL_FIXTURES[slug];
        await page.goto(`/?view=criar&slug=${slug}`);

        const finalize = await fillDocumentUntilFinalization(page, fixture);
        const responsePromise = page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            new URL(response.url()).pathname === "/api/documents/finalize",
          { timeout: 45000 }
        );
        await finalize.click();
        const response = await responsePromise;
        expect(response.status(), `${slug}: finalização`).toBe(200);

        const payload = await response.json();
        const documentId = payload.document?.id as string | undefined;
        expect(documentId, `${slug}: id do documento`).toBeTruthy();
        await waitForSearchParams(
          page,
          { view: "sucesso", slug, id: documentId! },
          45000
        );

        const detailResponse = await page.request.get(`/api/documents/${documentId}`, {
          headers: { Authorization: authorization },
        });
        expect(detailResponse.status(), `${slug}: detalhe`).toBe(200);
        const document = (await detailResponse.json()).document as {
          respostas?: Record<string, string>;
          clausulasSelecionadas?: string[];
        };
        expect(JSON.stringify(document.respostas ?? {}), `${slug}: respostas`).not.toContain("{{");

        const preview = await page.request.post("/api/documents/preview", {
          headers: { Authorization: authorization },
          data: {
            modeloSlug: slug,
            respostas: document.respostas ?? {},
            clausulasSelecionadas: document.clausulasSelecionadas ?? [],
          },
        });
        expect(preview.status(), `${slug}: preview PDF`).toBe(200);
        expect(preview.headers()["content-type"]).toContain("application/pdf");
        const previewBytes = await preview.body();
        expect(previewBytes.byteLength, `${slug}: tamanho do preview`).toBeGreaterThan(1000);
        expect(new TextDecoder().decode(previewBytes), `${slug}: placeholders no PDF`).not.toContain("{{");

        const download = await page.request.post(`/api/documents/${documentId}/download`, {
          headers: { Authorization: authorization },
        });
        expect(download.status(), `${slug}: download seguro`).toBe(200);
      });
    }
  });
});
