import { describe, expect, it, beforeEach } from "bun:test";
import { POST } from "./route";
import { getRepositories } from "@/lib/server/firestore/repositories";

describe("POST /api/documents/finalize", () => {
  const repos = getRepositories();

  const validGuestAnswers = {
    declarante_nome: "Maria Silva",
    declarante_cpf: "111.444.777-35",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteira",
    declarante_profissao: "Autônoma",
    declarante_cep: "01310-100",
    declarante_rua: "Av. Paulista",
    declarante_numero: "1000",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante de residência para matrícula",
    cidade_data: "São Paulo, 14 de agosto de 2026",
  };

  it("finalizes document for guest with paid order and returns guest link", async () => {
    const order = await repos.orders.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "maria@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const req = new Request("http://localhost:3000/api/documents/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "550e8400-e29b-41d4-a716-446655440010",
        modeloSlug: "declaracao-residencia",
        respostas: validGuestAnswers,
        guestContact: { email: "maria@example.com" },
        orderId: order.id,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const data = await res.json();
    expect(data.document.id).toBeDefined();
    expect(data.document.version).toBe(1);
    expect(data.document.artifactState).toBe("ready");
    expect(data.document.guestAccessToken).toBeDefined();
    expect(data.document.guestAccessPath).toContain("/d/");
  });

  it("returns 400 when draft input is invalid", async () => {
    const req = new Request("http://localhost:3000/api/documents/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "invalid-uuid",
        modeloSlug: "declaracao-residencia",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe("INVALID_REQUEST");
  });
});
