import { expect, test } from "bun:test";
import { sanitizeMarketingParams, trackMarketingEvent } from "./marketing-events";

test("sanitizeMarketingParams permite apenas parâmetros seguros aprovados", () => {
  const safe = sanitizeMarketingParams({
    position: "hero",
    slug: "contrato-locacao",
    category: "Locação",
    option: "gratis",
    faqId: "validade",
  });

  expect(safe.position).toBe("hero");
  expect(safe.slug).toBe("contrato-locacao");
  expect(safe.category).toBe("Locação");
  expect(safe.option).toBe("gratis");
  expect(safe.faqId).toBe("validade");
});

test("sanitizeMarketingParams remove dados sensíveis, pessoais, tokens ou consultas livres", () => {
  const sanitized = sanitizeMarketingParams({
    position: "hero",
    query: "como alugar para João da Silva",
    email: "usuario@teste.com",
    token: "secret-token-123",
    cpf: "123.456.789-00",
    answers: { locador: "Carlos" },
  });

  expect((sanitized as Record<string, unknown>).query).toBeUndefined();
  expect((sanitized as Record<string, unknown>).email).toBeUndefined();
  expect((sanitized as Record<string, unknown>).token).toBeUndefined();
  expect((sanitized as Record<string, unknown>).cpf).toBeUndefined();
  expect((sanitized as Record<string, unknown>).answers).toBeUndefined();
  expect(sanitized.position).toBe("hero");
});

test("trackMarketingEvent aceita apenas eventos da allowlist", () => {
  let dispatched = false;
  // @ts-expect-error testando evento fora da allowlist
  const result = trackMarketingEvent("evento_arbitrario_desconhecido", { slug: "contrato-locacao" });
  expect(result).toBe(false);
});
