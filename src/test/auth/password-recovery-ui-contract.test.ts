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

  it("mantém microflutuação suave sem círculo visível em volta dos mascotes", () => {
    const visual = source("src/components/docfacil/auth/password-recovery-visual.tsx");
    const visualCss = source("src/components/docfacil/auth/password-recovery-visual.module.css");

    const recoveryStart = visual.indexOf('variant === "recovery"');
    const successStart = visual.indexOf('variant === "success"');
    const resetStart = visual.indexOf("const Icon");
    const recoveryBlock = visual.slice(recoveryStart, successStart);
    const successBlock = visual.slice(successStart, resetStart);

    expect(visual.match(/styles\.mascotFloat/g)?.length).toBe(2);
    expect(recoveryBlock).not.toContain("border-dashed");
    expect(successBlock).not.toContain("border-dashed");
    expect(visualCss).toContain("@keyframes password-recovery-mascot-float");
    expect(visualCss).toContain("7.5s");
    expect(visualCss).toContain("translateY(-2px)");
    expect(visualCss).toContain("prefers-reduced-motion");
  });

  it("faz uma transição curta e fluida entre formulário e e-mail enviado", () => {
    const form = source("src/app/esqueci-senha/password-recovery-form.tsx");

    expect(form).toContain("AnimatePresence");
    expect(form).toContain("motion.div");
    expect(form).toContain('mode="wait"');
    expect(form).toContain("0.16");
    expect(form).toContain("0.1");
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

    for (const forbidden of ["oobCode", "apiKey", "SDK"]) {
      expect(form).not.toContain(forbidden);
      expect(page).not.toContain(forbidden);
    }
  });
});
