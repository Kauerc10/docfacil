import { describe, expect, it } from "bun:test";
import { POST } from "./route";

function createRequest(body: unknown) {
  return new Request("http://localhost:3000/api/consents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/consents", () => {
  it("exige autenticação antes de registrar aceite de cadastro", async () => {
    const res = await POST(
      createRequest({
        documents: ["termos", "privacidade"],
        flow: "cadastro",
        guestEmail: "teste@example.com",
      })
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("INVALID_AUTH_TOKEN");
  });

  it("exige e-mail para consentimento de checkout guest", async () => {
    const res = await POST(
      createRequest({
        documents: ["termos", "privacidade"],
        flow: "checkout",
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });

  it("não aceita consentimento sem Termos e Privacidade juntos", async () => {
    const res = await POST(
      createRequest({
        documents: ["termos", "marketing"],
        flow: "checkout",
        guestEmail: "teste@example.com",
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });
});
