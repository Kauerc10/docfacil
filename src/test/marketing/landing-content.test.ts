import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const landingFile = readFileSync(
  resolve(process.cwd(), "src/components/docfacil/landing/landing-page.tsx"),
  "utf-8"
);

test("landing contém a proposta de valor e a headline comercial aprovadas", () => {
  expect(landingFile).toContain("Documento difícil?");
  expect(landingFile).toContain("Nunca mais.");
  expect(landingFile).toContain("text-[var(--blue-royal)]");
  expect(landingFile).toContain(
    "Responda perguntas simples e veja seu documento ganhar forma, com orientação do início ao fim."
  );
  expect(landingFile).toContain("/documentos");
  expect(landingFile).toContain("#como-funciona");
});

test("landing explica claramente a regra de gratuidade sem omitir condições", () => {
  expect(landingFile.toLowerCase()).toContain("marca d");
  expect(landingFile.toLowerCase()).toContain("conta");
  expect(landingFile.toLowerCase()).toContain("gratuito");
});

test("landing declara explicitamente os limites jurídicos e a não substituição de advogado/cartório", () => {
  expect(landingFile.toLowerCase()).toContain("advogado");
  expect(landingFile.toLowerCase()).toContain("cartório");
  expect(landingFile).toContain("validade jurídica");
});

test("landing não inclui métricas infladas, depoimentos não verificados ou gerador de IA demonstrativo", () => {
  // Proibido inventar dados estatísticos não auditados
  expect(landingFile).not.toContain("+48 mil");
  expect(landingFile).not.toContain("+50.000");
  expect(landingFile).not.toContain("4.9/5");
  expect(landingFile).not.toContain("clientes satisfeitos");

  // O gerador demonstrativo de IA não deve ser anunciado como feature comercial ativa
  expect(landingFile).not.toContain("Gerador com IA");
  expect(landingFile).not.toContain("inteligência artificial generativa");

  // Sem depoimentos fakes
  expect(landingFile).not.toContain("depoimento");
  expect(landingFile).not.toContain("O que dizem sobre nós");
});

test("FAQ da landing responde às principais dúvidas do usuário com respostas objetivas", () => {
  expect(landingFile).toContain("Preciso entender de Direito?");
  expect(landingFile).toContain("Preciso criar uma conta?");
  expect(landingFile).toContain("É gratuito?");
  expect(landingFile).toContain("Consigo fazer pelo celular?");
  expect(landingFile).toContain("Meus dados ficam protegidos?");
  expect(landingFile).toContain("O documento tem validade jurídica?");
});
