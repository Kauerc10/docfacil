import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function getAllRouteFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllRouteFiles(fullPath));
    } else if (entry === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

describe("API Route Runtime Assertions", () => {
  const apiDir = join(process.cwd(), "src", "app", "api");
  const routeFiles = getAllRouteFiles(apiDir);

  it("found all API route files", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(10);
  });

  for (const file of routeFiles) {
    const rel = file.replace(process.cwd(), "");
    it(`route ${rel} explicitly declares runtime = "nodejs"`, () => {
      const content = readFileSync(file, "utf8");
      expect(content).toContain('runtime = "nodejs"');
    });
  }
});
