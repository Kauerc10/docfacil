import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const headerSource = readFileSync(
  resolve(process.cwd(), "src/components/docfacil/header.tsx"),
  "utf-8"
);
const footerSource = readFileSync(
  resolve(process.cwd(), "src/components/docfacil/footer.tsx"),
  "utf-8"
);
const petSource = readFileSync(
  resolve(process.cwd(), "src/components/docfacil/pet.tsx"),
  "utf-8"
);
const whatsappSource = readFileSync(
  resolve(process.cwd(), "src/components/docfacil/whatsapp-button.tsx"),
  "utf-8"
);

test("header possui links reais para as páginas públicas principais", () => {
  expect(headerSource).toContain("/documentos");
  expect(headerSource).toContain("#como-funciona");
  expect(headerSource).toContain("planos");
  expect(headerSource).toContain("ajuda");
});

test("menu mobile do header é protegido contra foco e leitura quando fechado", () => {
  // Quando fechado, deve conter aria-hidden e/ou inert/hidden
  expect(headerSource).toContain("aria-hidden");
  expect(headerSource).toContain("Escape");
});

test("footer não contém links fictícios, vazios ou sem destino implementado", () => {
  expect(footerSource).not.toContain("Carreiras");
  expect(footerSource).not.toContain("Imprensa");
  expect(footerSource).not.toContain("Blog");
  expect(footerSource).not.toContain("Falar com atendente");
  expect(footerSource).not.toContain("Status");
});

test("footer não anuncia gerador com IA enquanto o provider for demonstrativo", () => {
  expect(footerSource).not.toContain("Gerador com IA");
});

test("footer e whatsapp protegem contra promessa de atendimento humano com dados placeholder", () => {
  // Deve checar COMPANY_DATA_IS_PLACEHOLDER ou omitir WhatsApp caso ainda seja teste
  expect(
    footerSource.includes("COMPANY_DATA_IS_PLACEHOLDER") ||
    !footerSource.includes("Prefere falar com uma pessoa?")
  ).toBe(true);

  expect(
    whatsappSource.includes("COMPANY_DATA_IS_PLACEHOLDER") ||
    whatsappSource.includes("return null")
  ).toBe(true);
});

test("mascote corujinha desativa animações SMIL sob prefers-reduced-motion", () => {
  expect(petSource).toContain("prefers-reduced-motion");
  expect(petSource).toContain("reducedMotion");
});
