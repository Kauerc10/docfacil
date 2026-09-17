import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

describe("consent-service safety", () => {
  it("não utiliza o SDK do Firestore client para leitura ou escrita", () => {
    const servicePath = path.resolve(
      process.cwd(),
      "src/lib/services/consent-service.ts"
    );
    const content = fs.readFileSync(servicePath, "utf8");

    expect(content).not.toContain("firebase/firestore");
    expect(content).not.toContain("collection(");
    expect(content).not.toContain("getDocs(");
    expect(content).not.toContain("addDoc(");
    expect(content).not.toContain("setDoc(");
    expect(content).not.toContain("updateDoc(");
    expect(content).not.toContain("deleteDoc(");
    expect(content).toContain('apiFetch("/api/consents"');
    expect(content).toContain('from "@/lib/auth/api-fetch"');
  });
});
