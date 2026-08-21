import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("SucessoView Secure Share Contract", () => {
  it("does not leak window.location.href or direct SPA urls to clipboard or social share", () => {
    const filePath = join(
      process.cwd(),
      "src",
      "components",
      "docfacil",
      "views",
      "sucesso-view.tsx"
    );
    const source = readFileSync(filePath, "utf8");

    expect(source).not.toContain("navigator.clipboard.writeText(window.location.href)");
    expect(source).toContain("shareDocument");
  });
});
