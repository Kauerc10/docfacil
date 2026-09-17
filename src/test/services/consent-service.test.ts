import { describe, expect, it } from "bun:test";
import {
  recordConsent,
  listConsents,
  ConsentManager,
  type ConsentRecord,
} from "@/lib/services/consent-service";

type ConsentWithDocumentHashes = ConsentRecord & {
  documentHashes?: Partial<Record<"termos" | "privacidade" | "cookies", string>>;
};

const SHA256_HEX = /^[a-f0-9]{64}$/;

describe("consent-service", () => {
  it("registra hashes SHA-256 separados para os documentos legais aceitos", async () => {
    const record = (await recordConsent({
      userId: "user-test",
      userEmail: "user@example.com",
      documents: ["termos", "privacidade"],
      flow: "cadastro",
    })) as ConsentWithDocumentHashes;

    const termsHash = record.documentHashes?.termos;
    const privacyHash = record.documentHashes?.privacidade;

    expect(termsHash).toMatch(SHA256_HEX);
    expect(privacyHash).toMatch(SHA256_HEX);
    expect(termsHash).not.toBe(privacyHash);

    if (!termsHash) {
      throw new Error("Hash dos Termos não foi registrado.");
    }

    expect(record.termsHash).toBe(termsHash);
  });

  it("lista os consentimentos salvos em modo demo filtrando por usuário", async () => {
    const record = await recordConsent({
      userId: "user-list-test",
      userEmail: "user-list@example.com",
      documents: ["termos", "privacidade"],
      flow: "cadastro",
    });

    const userConsents = await listConsents("user-list-test");
    expect(userConsents.length).toBeGreaterThanOrEqual(1);
    expect(userConsents.some((c) => c.userId === "user-list-test")).toBe(true);

    const otherConsents = await listConsents("non-existent-user");
    expect(otherConsents).toEqual([]);
  });

  it("expõe a fachada unificada ConsentManager com compatibilidade retroativa", () => {
    expect(typeof ConsentManager.record).toBe("function");
    expect(typeof ConsentManager.list).toBe("function");
    expect(typeof ConsentManager.listUserConsents).toBe("function");
    expect(ConsentManager.record).toBe(recordConsent);
    expect(ConsentManager.list).toBe(listConsents);
  });
});

