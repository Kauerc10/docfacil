import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("SucessoView GSAP guards", () => {
  it("não tenta animar a prévia real antes de modelo e escopo existirem", () => {
    const sucesso = source("src/components/docfacil/views/sucesso-view.tsx");

    expect(sucesso).toContain("if (!root.current || !modelo) return;");
    expect(sucesso).toContain("root.current.querySelector");
    expect(sucesso).toContain("if (!sheet || !cta) return;");
    expect(sucesso).not.toContain("data-suc=\"stamp\"");
  });
});
