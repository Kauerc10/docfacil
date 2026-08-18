import { describe, expect, it } from "bun:test";
import {
  maskEmail,
  createPasswordResetService,
  parsePasswordResetAction,
} from "@/lib/auth/password-reset";

describe("password reset service", () => {
  it("mantém feedback neutro quando o provedor informa usuário inexistente", async () => {
    const service = createPasswordResetService({
      sendReset: async () => {
        const error = new Error("not found") as Error & { code?: string };
        error.code = "auth/user-not-found";
        throw error;
      },
      verifyCode: async () => "teste@example.com",
      confirmReset: async () => undefined,
    });

    await expect(
      service.requestPasswordReset("teste@example.com")
    ).resolves.toBeUndefined();
  });

  it("valida código e devolve apenas o e-mail associado", async () => {
    const service = createPasswordResetService({
      sendReset: async () => undefined,
      verifyCode: async () => "teste@example.com",
      confirmReset: async () => undefined,
    });

    await expect(service.verifyPasswordReset("codigo-valido")).resolves.toEqual({
      email: "teste@example.com",
    });
  });

  it("confirma nova senha com o código recebido", async () => {
    const calls: Array<[string, string]> = [];
    const service = createPasswordResetService({
      sendReset: async () => undefined,
      verifyCode: async () => "teste@example.com",
      confirmReset: async (code, password) => {
        calls.push([code, password]);
      },
    });

    await service.completePasswordReset("codigo", "NovaSenha123");
    expect(calls).toEqual([["codigo", "NovaSenha123"]]);
  });

  it("mascara e-mail sem revelar o endereço inteiro", () => {
    expect(maskEmail("kauerruon@gmail.com")).toBe("ka***@gmail.com");
  });

  it("aceita somente ação de redefinição com código presente", () => {
    expect(
      parsePasswordResetAction(
        "mode=resetPassword&oobCode=codigo-valido&lang=pt-BR"
      )
    ).toEqual({ code: "codigo-valido" });

    expect(parsePasswordResetAction("mode=resetPassword")).toBeNull();
    expect(
      parsePasswordResetAction("mode=verifyEmail&oobCode=codigo-email")
    ).toBeNull();
  });
});
