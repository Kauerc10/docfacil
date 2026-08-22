import { describe, expect, it } from "bun:test";
import { canLoadCreateSession } from "@/lib/documents/create-session-policy";

describe("carregamento da sessão de criação", () => {
  it("espera a autenticação ser resolvida antes de abrir o formulário", () => {
    expect(canLoadCreateSession(true)).toBe(false);
    expect(canLoadCreateSession(false)).toBe(true);
  });
});
