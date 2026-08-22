import { expect, type Page } from "@playwright/test";
import { waitForSearchParams } from "./navigation";

export interface DemoCheckoutOptions {
  email?: string;
  expectGuestConsent?: boolean;
}

export async function openSinglePurchaseCheckout(page: Page) {
  const buyButton = page
    .getByRole("button", { name: /baixar por r\$|comprar|desbloquear/i })
    .first();
  await expect(buyButton).toBeVisible({ timeout: 10000 });
  await buyButton.click();
  await waitForSearchParams(page, { view: "checkout" });
}

export async function completeDemoCheckout(
  page: Page,
  options: DemoCheckoutOptions = {}
) {
  const emailInput = page.locator("input[type='email']").first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(options.email ?? "e2e.checkout@docfacil.test");
  }

  const payCta = page.getByRole("button", { name: /pagar|assinar/i }).first();
  await expect(payCta).toBeVisible({ timeout: 10000 });
  await payCta.click();

  const termsCheckbox = page.locator("#consent-terms").first();
  const consentVisible = await termsCheckbox.isVisible({ timeout: 3000 }).catch(() => false);

  if (options.expectGuestConsent === false) {
    expect(consentVisible).toBe(false);
  }

  if (consentVisible) {
    await termsCheckbox.check();
    await page.locator("#consent-privacy").first().check();
    const acceptConsentBtn = page
      .getByRole("button", { name: /aceitar e continuar/i })
      .first();
    await expect(acceptConsentBtn).toBeEnabled({ timeout: 5000 });
    await acceptConsentBtn.click();
  }

  await waitForSearchParams(page, { view: "sucesso", orderId: null }, 45000);
}
