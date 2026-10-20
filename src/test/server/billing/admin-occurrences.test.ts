import { describe, expect, it } from "bun:test";
import { GET, POST } from "../../../app/api/billing/admin/occurrences/route";
import { BackendError } from "../../../lib/server/errors";

describe("Admin occurrences queue (Ticket 20)", () => {
  it("rejects unauthenticated requests without bearer token", async () => {
    const req = new Request("http://localhost:3000/api/billing/admin/occurrences", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("rejects post with invalid payload", async () => {
    const req = new Request("http://localhost:3000/api/billing/admin/occurrences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401); // Sem auth já falha fechado antes da lógica
  });
});
