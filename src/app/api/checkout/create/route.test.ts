import { describe, expect, it } from "bun:test";
import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/checkout/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout/create", () => {
  it("rejeita Pro guest antes de chamar o gateway", async () => {
    const response = await POST(request({ product: "pro", method: "card" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_AUTH_TOKEN");
  });

  it("rejeita avulso guest sem contato antes de criar cobrança", async () => {
    const response = await POST(request({ product: "avulso", method: "pix" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("trata strings vazias como contato ausente", async () => {
    const response = await POST(
      request({
        product: "avulso",
        method: "pix",
        guestContact: { email: "   ", phone: "   " },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_REQUEST");
  });
});
