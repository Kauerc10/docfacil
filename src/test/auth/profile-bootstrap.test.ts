import { describe, expect, it } from "bun:test";
import { resolveInitialProfileName } from "@/lib/auth/profile-bootstrap";

describe("perfil inicial do cadastro", () => {
  it("prioriza o nome digitado durante o cadastro antes do displayName do Firebase", () => {
    expect(
      resolveInitialProfileName({
        pendingSignupName: "Teste 2",
        firebaseDisplayName: null,
      })
    ).toBe("Teste 2");
  });

  it("usa o displayName do provedor quando não existe cadastro por e-mail pendente", () => {
    expect(
      resolveInitialProfileName({
        pendingSignupName: null,
        firebaseDisplayName: "Maria Google",
      })
    ).toBe("Maria Google");
  });

  it("mantém Usuário somente como último fallback", () => {
    expect(
      resolveInitialProfileName({
        pendingSignupName: null,
        firebaseDisplayName: null,
      })
    ).toBe("Usuário");
  });
});
