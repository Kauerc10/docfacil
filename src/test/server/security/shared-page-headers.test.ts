import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("Shared Access /d/* Privacy and Security Headers", () => {
  it("next.config.ts defines strict privacy headers for /d/:path*", () => {
    const configPath = join(process.cwd(), "next.config.ts");
    const content = readFileSync(configPath, "utf8");

    expect(content).toContain("/d/:path*");
    expect(content).toContain("private, no-store, max-age=0");
    expect(content).toContain("no-referrer");
    expect(content).toContain("noindex, nofollow, noarchive");
  });

  it("src/app/d/[token]/page.tsx defines strict noindex and no-referrer metadata", () => {
    const pagePath = join(process.cwd(), "src", "app", "d", "[token]", "page.tsx");
    const content = readFileSync(pagePath, "utf8");

    expect(content).toContain("robots");
    expect(content).toContain("index: false");
    expect(content).toContain("follow: false");
  });
});
