import { describe, expect, it } from "bun:test";
import { translateAuthError } from "@/lib/auth-context";

describe("Firebase Auth Error Translation", () => {
  it("translates modern auth/invalid-credential code into a clear message", () => {
    const msg = translateAuthError({ code: "auth/invalid-credential" });
    expect(msg).toContain("E-mail ou senha incorretos");
  });

  it("translates wrong password and user not found codes", () => {
    expect(translateAuthError({ code: "auth/wrong-password" })).toContain("Senha incorreta");
    expect(translateAuthError({ code: "auth/user-not-found" })).toContain("Nenhuma conta");
    expect(translateAuthError({ code: "auth/missing-password" })).toContain("senha");
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
