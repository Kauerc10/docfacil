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

  it("rota de solicitação usa feedback neutro e volta para o login", () => {
    const form = source("src/app/esqueci-senha/password-recovery-form.tsx");
    const page = source("src/app/esqueci-senha/page.tsx");

    expect(form).toContain("Se existir uma conta com esse e-mail");
    expect(form).toContain('href="/?view=login"');
    expect(form).toContain("requestPasswordReset");
    expect(form).toContain("45");
    expect(page).toContain("PasswordRecoveryForm");

    for (const forbidden of ["Firebase", "oobCode", "apiKey", "SDK"]) {
      expect(form).not.toContain(forbidden);
      expect(page).not.toContain(forbidden);
    }
  });
});
