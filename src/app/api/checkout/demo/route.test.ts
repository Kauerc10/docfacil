import { describe, expect, it } from "bun:test";
import { POST } from "./route";

describe("POST /api/checkout/demo", () => {
  it("creates and pays an avulso order for guest with contact info", async () => {
    const req = new Request("http://localhost:3000/api/checkout/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "avulso",
        guestContact: { email: "guest@example.com" },
        autoPay: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const data = await res.json();
    expect(data.order.id).toBeDefined();
    expect(data.order.status).toBe("paid");
    expect(data.order.product).toBe("avulso");
    expect(data.order.amountCents).toBe(1990);
    expect(data.order.buyer.type).toBe("guest");
    expect(data.order.buyer.email).toBe("guest@example.com");
  });

  it("does not allow a guest to activate Pro", async () => {
    const req = new Request("http://localhost:3000/api/checkout/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "pro",
        guestContact: { email: "guest@example.com" },
        autoPay: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("INVALID_AUTH_TOKEN");
  });

  it("returns 400 when guest avulso provides no contact info", async () => {
    const req = new Request("http://localhost:3000/api/checkout/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: "avulso" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });
});
