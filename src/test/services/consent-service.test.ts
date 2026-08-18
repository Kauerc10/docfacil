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

    expect(record.documentHashes?.termos).toMatch(SHA256_HEX);
    expect(record.documentHashes?.privacidade).toMatch(SHA256_HEX);
    expect(record.documentHashes?.termos).not.toBe(record.documentHashes?.privacidade);
    expect(record.documentHashes?.termos).toBeDefined();
    expect(record.termsHash).toBe(record.documentHashes!.termos);
  });
});
