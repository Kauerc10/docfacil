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

  it("usa o mascote de recuperação na experiência de esqueci minha senha", () => {
    const visual = source("src/components/docfacil/auth/password-recovery-visual.tsx");

    expect(visual).toContain("/mascotes/coruja-recuperacao-senha.svg");
    expect(visual).toContain('alt=""');
  });

  it("usa o mascote de e-mail enviado no estado de sucesso", () => {
    const visual = source("src/components/docfacil/auth/password-recovery-visual.tsx");

    expect(visual).toContain("/mascotes/coruja-email-enviado");
    expect(visual).toContain('variant === "success"');
  });

  it("mantém os mascotes dentro do selo com microflutuação suave", () => {
    const visual = source("src/components/docfacil/auth/password-recovery-visual.tsx");
    const css = source("src/app/globals.css");

    expect(visual).toContain("password-recovery-mascot-float");
    expect(visual).not.toContain("animate-[bounce_");
    expect(visual).toContain("h-32 w-32");
    expect(css).toContain("@keyframes password-recovery-mascot-float");
    expect(css).toContain("translateY(-2px)");
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

  it("redefinição cobre link inválido e sucesso sem expor parâmetros técnicos", () => {
    const form = source("src/app/redefinir-senha/password-reset-form.tsx");
    const page = source("src/app/redefinir-senha/page.tsx");

    expect(form).toContain("verifyPasswordReset");
    expect(form).toContain("completePasswordReset");
    expect(form).toContain("Esse link não é mais válido");
    expect(form).toContain("Entrar no DocFácil");
    expect(form).toContain("As senhas não coincidem");
    expect(page).toContain("PasswordResetForm");

    // Imports e identificadores internos podem citar o provedor. O contrato
    // protege a superfície pública: parâmetros do link e detalhes de SDK não
    // devem existir na view nem aparecer para a pessoa usuária.
    for (const forbidden of ["oobCode", "apiKey", "SDK"]) {
      expect(form).not.toContain(forbidden);
      expect(page).not.toContain(forbidden);
    }
  });
});
