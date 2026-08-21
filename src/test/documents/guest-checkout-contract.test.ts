import { describe, expect, it } from "bun:test";
import { buildCheckoutReturnUrl } from "@/lib/services/checkout-service";

describe("guest checkout return contract", () => {
  it("preserves slug and appends the authoritative orderId", () => {
    const url = buildCheckoutReturnUrl(
      "https://docfacil.test/?view=sucesso&slug=declaracao-residencia",
      "order_123"
    );

    const parsed = new URL(url);

    expect(parsed.searchParams.get("view")).toBe("sucesso");
    expect(parsed.searchParams.get("slug")).toBe("declaracao-residencia");
    expect(parsed.searchParams.get("orderId")).toBe("order_123");
  });

  it("replaces a stale orderId instead of duplicating it", () => {
    const url = buildCheckoutReturnUrl(
      "https://docfacil.test/?view=sucesso&slug=declaracao-residencia&orderId=stale",
      "order_real"
    );

    const parsed = new URL(url);

    expect(parsed.searchParams.getAll("orderId")).toEqual(["order_real"]);
  });

  it("does not return a guest checkout without orderId", async () => {
    const source = await Bun.file("src/lib/services/checkout-service.ts").text();

    expect(source).toContain("buildCheckoutReturnUrl");
    expect(source).not.toContain(
      "params.successUrl || `${window.location.origin}/?view=sucesso&orderId=${data.order.id}`"
    );
  });
});
