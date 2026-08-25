import { describe, expect, it } from "bun:test";
import { extractProviderErrorDetails } from "@/lib/server/billing/abacate/client";

describe("AbacatePay provider error details", () => {
  it("keeps only safe code/message fields from validation errors", () => {
    expect(
      extractProviderErrorDetails({
        code: "INVALID_PRODUCT",
        message: "Produto não encontrado",
        token: "dev_secret_should_never_log",
        details: { field: "items.0.id", authorization: "Bearer secret" },
      })
    ).toEqual({
      code: "INVALID_PRODUCT",
      message: "Produto não encontrado",
      field: "items.0.id",
    });
  });

  it("supports AbacatePay envelope-style errors without logging arbitrary raw values", () => {
    expect(
      extractProviderErrorDetails({
        message: "Validation failed",
        errors: {
          items: ["Product not found"],
          debug: "sql trace",
        },
      })
    ).toEqual({
      message: "Validation failed",
      field: "items",
      reason: "Product not found",
    });
  });

  it("captures safe top-level string errors returned by the provider", () => {
    expect(
      extractProviderErrorDetails("Produto inválido ou não encontrado.")
    ).toEqual({ message: "Produto inválido ou não encontrado." });
  });

  it("rejects sensitive top-level string errors", () => {
    expect(
      extractProviderErrorDetails("Authorization Bearer secret_should_never_log")
    ).toBeNull();
  });

  it("returns null when no safe diagnostic field exists", () => {
    expect(extractProviderErrorDetails({ debug: "sql trace" })).toBeNull();
  });
});
