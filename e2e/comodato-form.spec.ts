import { test, expect } from "@playwright/test";

test("permite preencher os dados do comodatário", async ({ page }) => {
  await page.goto("/?view=criar&slug=comodato");

  await expect(page.getByText("Dados de quem empresta (comodante)", { exact: true })).toBeVisible();
  await page.locator("#g-comodante_nome").fill("João da Silva");
  await page.locator("#g-comodante_nacionalidade").selectOption("Brasileiro(a)");
  await page.locator("#g-comodante_estado_civil").selectOption("solteiro(a)");
  await page.locator("#g-comodante_profissao").fill("Analista");
  await page.locator("#g-comodante_cpf").fill("11144477735");
  await page.locator("#g-comodante_cep").fill("01310100");
  await page.locator("#g-comodante_rua").fill("Avenida Paulista");
  await page.locator("#g-comodante_numero").fill("1500");
  await page.locator("#g-comodante_bairro").fill("Bela Vista");
  await page.locator("#g-comodante_cidade").fill("São Paulo");
  await page.locator("#g-comodante_uf").fill("SP");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();

  await expect(page.getByText("Dados de quem recebe (comodatário)", { exact: true })).toBeVisible();

  const nome = page.locator("#g-comodatario_nome");
  const nacionalidade = page.locator("#g-comodatario_nacionalidade");
  const estadoCivil = page.locator("#g-comodatario_estado_civil");

  await nome.fill("Mariana Alves Pereira");
  await nacionalidade.selectOption("Brasileiro(a)");
  await estadoCivil.selectOption("solteiro(a)");

  await expect(nome).toHaveValue("Mariana Alves Pereira");
  await expect(nacionalidade).toHaveValue("Brasileiro(a)");
  await expect(estadoCivil).toHaveValue("solteiro(a)");
});
