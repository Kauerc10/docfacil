import { expect, type Locator, type Page } from "@playwright/test";
import { valueForField } from "./test-data";
import { waitForCepLookupToSettle } from "./navigation";

export interface FillDocumentOptions {
  fieldValues?: Record<string, string>;
  rentalGuarantee?: "Sem garantia" | "Caução" | "Fiador" | "Seguro-fiança";
  clauseExtras?: Record<string, string>;
  residents?: string[];
  maxSteps?: number;
}

function fieldKey(locator: Locator, label: string, fallbackIndex: number) {
  return locator
    .getAttribute("id")
    .then((id) => id?.replace(/^g-/, "").replace(/^extra-[^-]+-/, "") ?? label || `field-${fallbackIndex}`);
}

async function stepSignature(page: Page) {
  return page.locator("input:visible, select:visible, textarea:visible, [role='radiogroup']:visible, [role='checkbox']:visible")
    .evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const el = node as HTMLElement;
          return [
            el.tagName,
            el.id,
            el.getAttribute("aria-label"),
            el.getAttribute("role"),
          ].join(":");
        })
        .sort()
        .join("|")
    );
}

async function chooseSelect(locator: Locator, desired?: string) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      text: (node.textContent ?? "").trim(),
      disabled: (node as HTMLOptionElement).disabled,
    }))
  );

  const selected =
    (desired && options.find((option) => option.value === desired || option.text === desired)) ||
    options.find((option) => !option.disabled && /^não$/i.test(option.text)) ||
    options.find((option) => !option.disabled && option.value !== "");

  if (selected) await locator.selectOption(selected.value);
}

async function fillVisibleFields(page: Page, options: FillDocumentOptions) {
  const controls = page.locator("input:visible, select:visible, textarea:visible");
  const count = await controls.count();
  let cpfIndex = 0;

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    if (await control.isDisabled().catch(() => true)) continue;

    const id = (await control.getAttribute("id")) ?? "";
    if (id.startsWith("consent-") || id.startsWith("cad-")) continue;

    const label =
      (await control.getAttribute("aria-label")) ??
      (id ? (await page.locator(`label[for='${id}']`).textContent().catch(() => null)) ?? "" : "");
    const key = await fieldKey(control, label, index);
    const override = options.fieldValues?.[key] ?? options.clauseExtras?.[key];
    const tag = await control.evaluate((element) => element.tagName.toLowerCase());

    if (tag === "select") {
      await chooseSelect(control, override);
      continue;
    }

    const current = await control.inputValue().catch(() => "");
    if (current.trim()) continue;

    const value = override ?? valueForField(key, key.toLowerCase().includes("cpf") ? cpfIndex++ : index);
    await control.fill(value);

    if (key.toLowerCase().includes("cep")) {
      await control.blur();
      await waitForCepLookupToSettle(page);
    }
  }
}

async function handleResidents(page: Page, residents: string[]) {
  const noResidents = page.getByRole("button", { name: "Não, só o inquilino", exact: true });
  if (!(await noResidents.isVisible().catch(() => false))) return false;

  if (residents.length === 0) {
    await noResidents.click();
    return true;
  }

  await page.getByRole("button", { name: "Sim, adicionar morador", exact: true }).click();
  for (let index = 0; index < residents.length; index += 1) {
    if (index > 0) {
      await page.getByRole("button", { name: "Adicionar outra pessoa", exact: true }).click();
    }
    const section = page.getByRole("region", { name: new RegExp(`morador ${index + 1}`, "i") });
    await section.getByPlaceholder("Ex: Maria Aparecida da Silva").fill(residents[index] ?? `Morador ${index + 1}`);
  }
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  return true;
}

async function handleClauses(page: Page, options: FillDocumentOptions) {
  const guaranteeGroup = page.getByRole("radiogroup", { name: "Garantia do aluguel" });
  if (await guaranteeGroup.isVisible().catch(() => false)) {
    const choice = options.rentalGuarantee ?? "Sem garantia";
    const radio = page.getByRole("radio", { name: choice, exact: true });
    await radio.click();
    await expect(radio).toHaveAttribute("aria-checked", "true");
    await fillVisibleFields(page, options);
    return true;
  }

  const checkboxes = page.locator("[role='checkbox']:visible");
  return (await checkboxes.count()) > 0;
}

export async function fillDocumentUntilFinalization(
  page: Page,
  options: FillDocumentOptions = {}
) {
  const maxSteps = options.maxSteps ?? 20;

  for (let step = 0; step < maxSteps; step += 1) {
    const finalize = page.getByRole("button", { name: /^finalizar$/i }).first();
    const advance = page.getByRole("button", { name: /^avançar$/i }).first();

    if (await handleResidents(page, options.residents ?? [])) {
      continue;
    }

    await handleClauses(page, options);
    await fillVisibleFields(page, options);

    if (await finalize.isVisible().catch(() => false)) {
      return finalize;
    }

    await expect(advance).toBeVisible({ timeout: 10000 });
    const before = await stepSignature(page);
    await advance.click();
    await expect
      .poll(() => stepSignature(page), { timeout: 10000 })
      .not.toBe(before);
  }

  throw new Error(`Fluxo não chegou à finalização em ${maxSteps} etapas.`);
}
