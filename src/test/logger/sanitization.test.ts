import { describe, expect, it } from "bun:test";
import { sanitizeLogData } from "@/lib/logger";

describe("Logger PII & Sensitive Data Sanitization", () => {
  it("redacts sensitive keys such as cpf, rg, email, phone, token, senha, answers", () => {
    const raw: Record<string, any> = {
      cpf: "123.456.789-00",
      rg: "12.345.678-9",
      email: "user@example.com",
      phone: "+5511999998888",
      token: "secret_token_123",
      senha: "mypassword",
      answers: { declarante_nome: "Maria", rg: "123" },
      respostas: { locatario_nome: "João" },
      modeloSlug: "declaracao-residencia",
    };

    const sanitized = sanitizeLogData(raw);

    expect(sanitized.cpf).toBe("[REDACTED]");
    expect(sanitized.rg).toBe("[REDACTED]");
    expect(sanitized.email).toBe("[REDACTED]");
    expect(sanitized.phone).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.senha).toBe("[REDACTED]");
    expect(sanitized.answers).toBe("[REDACTED]");
    expect(sanitized.respostas).toBe("[REDACTED]");
    expect(sanitized.modeloSlug).toBe("declaracao-residencia");
  });

  it("recursively sanitizes nested objects and arrays", () => {
    const raw = {
      user: {
        id: "usr_123",
        credentials: {
          password: "supersecret",
          tokens: ["tok_1", "tok_2"],
        },
      },
      events: [
        { type: "LOGIN", email: "alice@test.com" },
        { type: "CLICK", target: "btn-submit" },
      ],
    };

    const sanitized = sanitizeLogData(raw);

    expect(sanitized.user.id).toBe("usr_123");
    expect(sanitized.user.credentials.password).toBe("[REDACTED]");
    expect(sanitized.events[0].email).toBe("[REDACTED]");
    expect(sanitized.events[1].target).toBe("btn-submit");
  });
});
