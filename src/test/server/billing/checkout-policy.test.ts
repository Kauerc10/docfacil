import { describe, expect, it } from "bun:test";
import { BackendError, type BackendErrorCode } from "@/lib/server/errors";
import { validateCheckoutSelection } from "@/lib/server/billing/checkout-policy";

function expectBackendCode(fn: () => void, code: BackendErrorCode) {
  try {
    fn();
    throw new Error("expected checkout policy to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).code).toBe(code);
  }
}

describe("checkout access policy", () => {
  it("rejects Pro for guests before the provider is called", () => {
    expectBackendCode(
      () =>
        validateCheckoutSelection({
          product: "pro",
          method: "card",
          principal: { type: "guest" },
        }),
      "INVALID_AUTH_TOKEN"
    );
  });

  it("rejects PIX for Pro even for authenticated users", () => {
    expectBackendCode(
      () =>
        validateCheckoutSelection({
          product: "pro",
          method: "pix",
          principal: { type: "user", userId: "user_1", email: "u@example.com" },
        }),
      "INVALID_REQUEST"
    );
  });

  it("rejects guest avulso without e-mail or phone", () => {
    expectBackendCode(
      () =>
        validateCheckoutSelection({
          product: "avulso",
          method: "pix",
          principal: { type: "guest" },
        }),
      "INVALID_REQUEST"
    );
  });

  it("accepts guest avulso with e-mail only", () => {
    expect(() =>
      validateCheckoutSelection({
        product: "avulso",
        method: "pix",
        principal: { type: "guest" },
        guestContact: { email: "guest@example.com" },
      })
    ).not.toThrow();
  });

  it("accepts authenticated avulso without guest contact", () => {
    expect(() =>
      validateCheckoutSelection({
        product: "avulso",
        method: "card",
        principal: { type: "user", userId: "user_1" },
      })
    ).not.toThrow();
  });
});
