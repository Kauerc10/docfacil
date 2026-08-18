import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("contrato de autenticação das APIs client-side", () => {
  it("documentos usa o cliente autenticado centralizado e não obtém token diretamente", () => {
    const text = source("src/lib/documents/client.ts");
    expect(text).toContain('from "@/lib/auth/api-fetch"');
    expect(text).toContain("apiFetch(");
    expect(text).not.toContain("getIdToken(");
    expect(text).not.toContain("getAuthHeaders");
  });

  it("consentimento usa o mesmo cliente autenticado e não obtém token diretamente", () => {
    const text = source("src/lib/services/consent-service.ts");
    expect(text).toContain('from "@/lib/auth/api-fetch"');
    expect(text).toContain("apiFetch(");
    expect(text).not.toContain("getIdToken(");
    expect(text).not.toContain("getConsentHeaders");
  });
});
