import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

describe("consent-service safety", () => {
  it("não grava evidência jurídica diretamente pelo Firebase client", () => {
    const servicePath = path.resolve(
      process.cwd(),
      "src/lib/services/consent-service.ts"
    );
    const content = fs.readFileSync(servicePath, "utf8");

    expect(content).not.toContain("addDoc(");
    expect(content).not.toContain("setDoc(");
    expect(content).not.toContain("updateDoc(");
    expect(content).not.toContain("deleteDoc(");
    expect(content).toContain('fetch("/api/consents"');
  });
});
