import { describe, expect, it } from "bun:test";
import {
  getLegalDocumentEvidence,
  LEGAL_HASH_SCOPE,
} from "@/lib/server/legal-consent-evidence";

const SHA256_HEX = /^[a-f0-9]{64}$/;

describe("legal consent evidence", () => {
  it("gera evidência determinística e separada para Termos e Privacidade", () => {
    const first = getLegalDocumentEvidence(["termos", "privacidade"]);
    const second = getLegalDocumentEvidence(["termos", "privacidade"]);

    expect(first.termos?.version).toBe("1.0");
    expect(first.privacidade?.version).toBe("1.0");
    expect(first.termos?.sha256).toMatch(SHA256_HEX);
    expect(first.privacidade?.sha256).toMatch(SHA256_HEX);
    expect(first.termos?.sha256).not.toBe(first.privacidade?.sha256);
    expect(second).toEqual(first);
    expect(LEGAL_HASH_SCOPE).toBe("canonical-react-content-v1");
  });
});
