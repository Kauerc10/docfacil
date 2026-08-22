import { expect, type Page } from "@playwright/test";

export async function waitForSearchParams(
  page: Page,
  checks: Record<string, string | null>,
  timeout = 40000
) {
  await page.waitForURL(
    (url) => {
      const sp = url.searchParams;
      return Object.entries(checks).every(([key, value]) =>
        value === null ? sp.has(key) : sp.get(key) === value
      );
    },
    { waitUntil: "commit", timeout }
  );
}

export async function acceptOptionalCookies(page: Page) {
  const acceptAll = page.getByRole("button", {
    name: "Aceitar todos",
    exact: true,
  });
  const visible = await acceptAll.isVisible({ timeout: 3000 }).catch(() => false);
  if (!visible) return;

  await acceptAll.click();
  await expect(
    page.getByRole("dialog", { name: "Consentimento de cookies" })
  ).toBeHidden({ timeout: 5000 });
}

export async function mockCepLookup(page: Page) {
  await page.route("https://viacep.com.br/ws/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
      }),
    });
  });
}

export async function waitForCepLookupToSettle(page: Page) {
  const found = page.getByText("endereço encontrado").first();
  const failed = page
    .getByText(/Não encontramos esse CEP automaticamente/i)
    .first();

  await expect
    .poll(
      async () => {
        if (await found.isVisible().catch(() => false)) return "done";
        if (await failed.isVisible().catch(() => false)) return "done";
        return "waiting";
      },
      { timeout: 12000 }
    )
    .toBe("done");
}
