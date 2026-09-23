import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

describe("RUON Signature Badge no Rodapé do DocFácil", () => {
  const footerPath = path.resolve(process.cwd(), "src/components/docfacil/footer.tsx");
  const footerSource = fs.readFileSync(footerPath, "utf8");

  it("carrega o Web Component oficial da RUON via Next.js Script lazyOnload", () => {
    expect(footerSource).toContain('src="https://ruon.dev/badge.js"');
    expect(footerSource).toContain('strategy="lazyOnload"');
  });

  it("renderiza o custom element <ruon-badge> com atributos corretos para o DocFácil", () => {
    expect(footerSource).toContain('<ruon-badge');
    expect(footerSource).toContain('project="docfacil"');
    expect(footerSource).toContain('theme="dark"');
    expect(footerSource).toContain('size="sm"');
  });

  it("substitui qualquer assinatura provisória antiga", () => {
    expect(footerSource).not.toContain("Powered by K");
  });
});
