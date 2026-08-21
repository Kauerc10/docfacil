import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

describe("documents-service safety", () => {
  it("does not import any firestore writer functions (addDoc, updateDoc, deleteDoc, setDoc)", () => {
    const servicePath = path.resolve(process.cwd(), "src/lib/services/documents-service.ts");
    const content = fs.readFileSync(servicePath, "utf8");

    expect(content).not.toContain("addDoc(");
    expect(content).not.toContain("updateDoc(");
    expect(content).not.toContain("deleteDoc(");
    expect(content).not.toContain("setDoc(");
  });
});
