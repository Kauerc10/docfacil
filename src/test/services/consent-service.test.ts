import { describe, expect, it } from "bun:test";
import {
  recordConsent,
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
});
