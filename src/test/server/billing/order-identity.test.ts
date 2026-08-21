import { describe, expect, it } from "bun:test";
import {
  normalizeEmail,
  normalizePhone,
  createBuyerFingerprint,
} from "@/lib/server/billing/order-identity";

describe("Order Identity and Buyer Fingerprint", () => {
  it("normalizes email to lowercase and trims whitespace", () => {
    expect(normalizeEmail("  Alice@Example.COM ")).toBe("alice@example.com");
  });

  it("normalizes phone stripping masks and non-digit characters", () => {
    expect(normalizePhone("+55 (11) 98765-4321")).toBe("5511987654321");
  });

  it("generates deterministic SHA-256 fingerprint without leaking plaintext PII", () => {
    const fp1 = createBuyerFingerprint({ email: "João@Gmail.com", phone: "(11) 9999-8888" });
    const fp2 = createBuyerFingerprint({ email: "joao@gmail.com ", phone: "+551199998888" });

    expect(fp1).toHaveLength(64);
    expect(fp1).not.toContain("joao");
    expect(fp1).not.toContain("gmail");
  });
});
