import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("cadastro e consentimento", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/docfacil/views/cadastro-view.tsx"),
    "utf8"
  );

  it("usa um único aceite no formulário e não renderiza o modal de consentimento", () => {
    expect(source).not.toContain("TermsConsentModal");
    expect(source).toContain('id="cad-terms"');
    expect(source).toContain('documents: ["termos", "privacidade"]');
  });

  it("mantém Termos e Privacidade acessíveis sem desmontar o formulário", () => {
    expect(source).toContain('href="/termos"');
    expect(source).toContain('href="/privacidade"');
    expect(source).toContain('target="_blank"');
  });
});
