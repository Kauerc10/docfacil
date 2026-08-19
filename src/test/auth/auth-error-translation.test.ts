import { describe, expect, it } from "bun:test";
import { translateAuthError } from "@/lib/auth-context";

describe("Firebase Auth Error Translation", () => {
  it("usa a mesma mensagem para credencial inválida, usuário ausente e senha errada", () => {
    const expected = "E-mail ou senha incorretos. Verifique a digitação ou entre com o Google.";

    expect(translateAuthError({ code: "auth/invalid-credential" })).toBe(expected);
    expect(translateAuthError({ code: "auth/wrong-password" })).toBe(expected);
    expect(translateAuthError({ code: "auth/user-not-found" })).toBe(expected);
  });

  it("mantém validações locais de campos obrigatórios", () => {
    expect(translateAuthError({ code: "auth/missing-password" })).toContain("senha");
    expect(translateAuthError({ code: "auth/missing-email" })).toContain("e-mail");
  });

  it("translates provider and popup conflicts", () => {
    expect(translateAuthError({ code: "auth/account-exists-with-different-credential" })).toContain("outro método");
    expect(translateAuthError({ code: "auth/popup-closed-by-user" })).toContain("cancelado");
  });

  it("falls back gracefully on unknown errors", () => {
    expect(translateAuthError({ code: "auth/strange-unknown-code" })).toContain("Não foi possível");
    expect(translateAuthError(null)).toContain("Não foi possível");
  });
});
