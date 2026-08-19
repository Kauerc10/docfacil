import { describe, expect, it } from "bun:test";
import { classifyFinalizationError } from "@/components/docfacil/views/criar/finalization-error";

function freeLimitError() {
  const error = new Error("Você atingiu o limite de 3 documentos gratuitos deste mês.") as Error & {
    code?: string;
    status?: number;
  };
  error.code = "FREE_LIMIT_REACHED";
  error.status = 402;
  return error;
}

describe("free monthly limit UX", () => {
  it("reconhece FREE_LIMIT_REACHED como paywall, não como falha genérica", () => {
    expect(classifyFinalizationError(freeLimitError())).toBe("free_limit");
  });

  it("não transforma qualquer 402 em limite gratuito", () => {
    const error = new Error("Pagamento pendente") as Error & { code?: string; status?: number };
    error.code = "ORDER_NOT_PAID";
    error.status = 402;

    expect(classifyFinalizationError(error)).toBe("generic");
  });

  it("não confunde erro de rede com paywall", () => {
    expect(classifyFinalizationError(new Error("Network error"))).toBe("generic");
  });
});
