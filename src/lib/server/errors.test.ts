import { describe, expect, it } from "bun:test";
import { BackendError, isBackendError } from "./errors";

describe("BackendError", () => {
  it("creates structured error with correct status and code", () => {
    const err = new BackendError("INVALID_AUTH_TOKEN", 401, "Token inválido", { reason: "expired" });
    expect(err.code).toBe("INVALID_AUTH_TOKEN");
    expect(err.status).toBe(401);
    expect(err.message).toBe("Token inválido");
    expect(err.details).toEqual({ reason: "expired" });
    expect(isBackendError(err)).toBe(true);
  });

  it("converts to JSON response with safe payload and no-store headers", async () => {
    const err = new BackendError("DOCUMENT_NOT_FOUND", 404, "Documento não encontrado");
    const response = err.toResponse();
    
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/json");

    const json = await response.json();
    expect(json).toEqual({
      error: {
        code: "DOCUMENT_NOT_FOUND",
        message: "Documento não encontrado",
      },
    });
  });

  it("handles unknown error conversion safely without exposing internal details", async () => {
    const internalErr = new Error("Database connection timeout at 10.0.0.1:5432");
    const backendErr = BackendError.fromUnknown(internalErr);

    expect(backendErr.code).toBe("INTERNAL_ERROR");
    expect(backendErr.status).toBe(500);
    expect(backendErr.message).toBe("Ocorreu um erro interno. Tente novamente mais tarde.");
    
    const response = backendErr.toResponse();
    const json = await response.json();
    expect(json.error.message).not.toContain("10.0.0.1");
  });
});
