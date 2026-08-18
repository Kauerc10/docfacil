import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type PolicyModule = typeof import("@/lib/auth/password-policy");

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

async function loadPolicyModule(): Promise<Partial<PolicyModule>> {
  try {
    return await import("@/lib/auth/password-policy");
  } catch {
    return {};
  }
}

describe("hardening da conta Firebase", () => {
  it("torna browserLocalPersistence explícita", () => {
    const text = source("src/lib/firebase.ts");
    expect(text).toContain("browserLocalPersistence");
    expect(text).toContain("setPersistence");
    expect(text).toContain("ensureAuthPersistence");
  });

  it("expõe reset de senha real e o login deixa de mandar para ajuda", () => {
    const authContext = source("src/lib/auth-context.tsx");
    const login = source("src/components/docfacil/views/login-view.tsx");

    expect(authContext).toContain("sendPasswordResetEmail");
    expect(authContext).toContain("requestPasswordReset");
    expect(authContext).toContain('languageCode = "pt-BR"');
    expect(login).toContain("requestPasswordReset");
    expect(login).not.toContain('navigate("ajuda")');
    expect(login).toContain("Se existir uma conta com esse e-mail");
  });

  it("consulta a política de senha do Firebase antes do cadastro", () => {
    const cadastro = source("src/components/docfacil/views/cadastro-view.tsx");
    expect(cadastro).toContain("validateSignupPassword");
  });
});

describe("mensagem da política de senha", () => {
  it("mantém mínimo local de 8 caracteres", async () => {
    const mod = await loadPolicyModule();
    expect(typeof mod.validateSignupPassword).toBe("function");
    if (!mod.validateSignupPassword) return;

    const result = await mod.validateSignupPassword("abc123", {
      validateFirebasePassword: async () => ({ isValid: true }),
    });

    expect(result).toContain("8 caracteres");
  });

  it("traduz requisitos ativos retornados pela política Firebase", async () => {
    const mod = await loadPolicyModule();
    expect(typeof mod.validateSignupPassword).toBe("function");
    if (!mod.validateSignupPassword) return;

    const result = await mod.validateSignupPassword("abcdefgh", {
      validateFirebasePassword: async () => ({
        isValid: false,
        containsUppercaseLetter: false,
        containsNumericCharacter: false,
        containsLowercaseLetter: true,
      }),
    });

    expect(result).toContain("letra maiúscula");
    expect(result).toContain("número");
  });

  it("aceita senha válida conforme mínimo local e política Firebase", async () => {
    const mod = await loadPolicyModule();
    expect(typeof mod.validateSignupPassword).toBe("function");
    if (!mod.validateSignupPassword) return;

    const result = await mod.validateSignupPassword("Abcdefg1", {
      validateFirebasePassword: async () => ({ isValid: true }),
    });

    expect(result).toBeNull();
  });
});
