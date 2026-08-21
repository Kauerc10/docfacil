import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("Payment Status Client-Side Safety", () => {
  it("checkout-service does not infer payment from orderId or client state", () => {
    const filePath = join(process.cwd(), "src", "lib", "services", "checkout-service.ts");
    const source = readFileSync(filePath, "utf8");

    expect(source).not.toContain("paid: Boolean(orderId)");
    expect(source).not.toContain("paid=1");
    expect(source).not.toContain("checkPaymentStatus");
  });
});
