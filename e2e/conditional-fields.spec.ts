import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { createAuthenticatedAccount } from "./support/auth";
import {
  fillCurrentDocumentStep,
  fillDocumentUntilFinalization,
} from "./support/document-form";
import { mockCepLookup } from "./support/navigation";
import { VALID_CPFS } from "./support/test-data";

const PURCHASE_SLUG = "contrato-compra-venda-imovel";
const RENTAL_SLUG = "contrato-locacao";

async function createAccount(page: Page, testInfo: TestInfo) {
  return createAuthenticatedAccount(page, testInfo, {
    name: "Condicionais E2E",
  });
}

async function advanceUntilVisible(page: Page, selector: string, maxSteps = 12) {
  const target = page.locator(selector);

  for (let step = 0; step < maxSteps; step += 1) {
    if (await target.isVisible().catch(() => false)) return target;

    const progress = page.getByRole("progressbar", { name: "Progresso do documento" });
    await expect(progress).toBeVisible({ timeout: 10000 });
    const before = await progress.getAttribute("aria-valuenow");

    await fillCurrentDocumentStep(page);
    const advance = page.getByRole("button", { name: /^avançar$/i }).first();
    await expect(advance).toBeVisible({ timeout: 10000 });
    await advance.click();
    await expect
      .poll(() => progress.getAttribute("aria-valuenow"), { timeout: 10000 })
      .not.toBe(before);
  }

  throw new Error(`Campo ${selector} não apareceu em ${maxSteps} etapas.`);
}

test.describe("Conditional fields and residents E2E", () => {
  test.setTimeout(240000);

  test.beforeEach(async ({ page }) => {
    await mockCepLookup(page);
  });

  test("Sim → preencher → Não remove sinal oculto antes da finalização", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);
    await page.goto(`/?view=criar&slug=${PURCHASE_SLUG}`);

    const possuiSinal = await advanceUntilVisible(page, "#g-possui_sinal");
    await possuiSinal.selectOption("Sim");

    const sinal = page.locator("#g-sinal");
    const formaPagamentoSinal = page.locator("#g-forma_pagamento_sinal");
    await expect(sinal).toBeVisible();
    await expect(formaPagamentoSinal).toBeVisible();

    await sinal.fill("35000");
    await formaPagamentoSinal.fill("PIX na assinatura");
    await expect(sinal).not.toHaveValue("");

    await possuiSinal.selectOption("Não");
    await expect(sinal).toBeHidden();
    await expect(formaPagamentoSinal).toBeHidden();

    const finalize = await fillDocumentUntilFinalization(page, {
      fieldValues: { possui_sinal: "Não" },
    });

    const finalizeRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/documents/finalize"
    );
    await finalize.click();
    const finalizeRequest = await finalizeRequestPromise;
    const body = finalizeRequest.postDataJSON() as {
      respostas?: Record<string, string>;
    };

    expect(body.respostas?.possui_sinal).toBe("Não");
    expect(body.respostas?.sinal).toBeUndefined();
    expect(body.respostas?.forma_pagamento_sinal).toBeUndefined();
  });

  test("moradores adicionais preservam nomes com espaços ao voltar e avançar", async ({
    page,
  }, testInfo) => {
    await createAccount(page, testInfo);
    await page.goto(`/?view=criar&slug=${RENTAL_SLUG}`);

    await advanceUntilVisible(page, 'button:has-text("Sim, adicionar morador")');
    await page.getByRole("button", { name: "Sim, adicionar morador", exact: true }).click();

    const firstResident = page.getByRole("region", { name: /morador 1/i });
    const firstName = firstResident.getByPlaceholder("Ex: Maria Aparecida da Silva");
    const firstCpf = firstResident.getByPlaceholder("Ex: 123.456.789-00");
    await firstName.fill("João Pedro da Silva");
    await firstCpf.fill(VALID_CPFS[0]);

    await page.getByRole("button", { name: "Adicionar outra pessoa", exact: true }).click();
    const secondResident = page.getByRole("region", { name: /morador 2/i });
    const secondName = secondResident.getByPlaceholder("Ex: Maria Aparecida da Silva");
    await secondName.fill("Maria Clara dos Santos");

    await expect(firstName).toHaveValue("João Pedro da Silva");
    await expect(secondName).toHaveValue("Maria Clara dos Santos");

    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByRole("radiogroup", { name: "Garantia do aluguel" })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(firstResident).toBeVisible({ timeout: 10000 });
    await expect(firstName).toHaveValue("João Pedro da Silva");
    await expect(firstCpf).toHaveValue(VALID_CPFS[0]);
    await expect(secondName).toHaveValue("Maria Clara dos Santos");

    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByRole("radiogroup", { name: "Garantia do aluguel" })).toBeVisible({
      timeout: 10000,
    });
  });
});
