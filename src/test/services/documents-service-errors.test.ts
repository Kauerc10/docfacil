import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("Documents Service Fail-Closed Error Propagation", () => {
  it("does not catch API errors to fallback to demo docs when Firebase is configured", () => {
    const filePath = join(
      process.cwd(),
      "src",
      "lib",
      "services",
      "documents-service.ts"
    );
    const source = readFileSync(filePath, "utf8");

    expect(source).not.toContain("catch {\n    // Fallback demo");
    expect(source).not.toContain("Fallback demo caso a API não esteja disponível");
  });
});
