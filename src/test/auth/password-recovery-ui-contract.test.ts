import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("experiência pública de recuperação de senha", () => {
  it("shell e visual não vazam detalhes técnicos e respeitam reduced motion", () => {
    const shell = source("src/components/docfacil/auth/password-recovery-shell.tsx");
    const visual = source("src/components/docfacil/auth/password-recovery-visual.tsx");
    const css = source("src/app/globals.css");

    for (const forbidden of ["Firebase", "oobCode", "apiKey", "SDK"]) {
      expect(shell).not.toContain(forbidden);
      expect(visual).not.toContain(forbidden);
    }

    expect(visual).toContain("motion-safe:");
    expect(css).toContain("prefers-reduced-motion");
  });
});
