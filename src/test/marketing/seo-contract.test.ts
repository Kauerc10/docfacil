import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

const layoutSource = readFileSync(
  resolve(process.cwd(), "src/app/layout.tsx"),
  "utf-8"
);
const planosSource = readFileSync(
  resolve(process.cwd(), "src/app/(marketing)/planos/page.tsx"),
  "utf-8"
);

test("sitemap gera apenas URLs absolutas e canônicas", () => {
  const map = sitemap();
  for (const entry of map) {
    expect(entry.url.startsWith("http")).toBe(true);
    expect(entry.url).not.toContain("?view=");
  }
});

test("robots.txt define sitemap e host canônicos", () => {
  const r = robots();
  expect(r.sitemap).toBeDefined();
  expect(r.sitemap?.toString().endsWith("/sitemap.xml")).toBe(true);
});

test("não existem schemas de avaliação falsa (Review / AggregateRating) no produto", () => {
  expect(layoutSource).not.toContain('"AggregateRating"');
  expect(layoutSource).not.toContain('"Review"');
  expect(planosSource).not.toContain('"AggregateRating"');
  expect(planosSource).not.toContain('"Review"');
});

test("metadata raiz define título, descrição e viewport seguros", () => {
  expect(layoutSource).toContain("title");
  expect(layoutSource).toContain("description");
});
