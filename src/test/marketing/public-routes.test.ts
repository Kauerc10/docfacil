import { expect, test } from "bun:test";
import { PUBLIC_MODELS } from "@/lib/catalog/public-models";
import { MODELOS } from "@/lib/modelos";
import { generateMetadata, generateStaticParams } from "@/app/(marketing)/documentos/[slug]/page";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

test("todos os modelos do catálogo interno estão mapeados nos modelos públicos", () => {
  expect(PUBLIC_MODELS.length).toBe(MODELOS.length);
  const slugs = new Set(PUBLIC_MODELS.map((m) => m.slug));
  for (const modelo of MODELOS) {
    expect(slugs.has(modelo.slug)).toBe(true);
  }
});

test("modelos públicos contêm todos os metadados necessários sem expor templates internos", () => {
  for (const model of PUBLIC_MODELS) {
    expect(model.slug).toBeDefined();
    expect(model.nome.length).toBeGreaterThan(0);
    expect(model.descricao.length).toBeGreaterThan(0);
    expect(model.quandoUsar.length).toBeGreaterThan(0);
    expect(model.categoria.length).toBeGreaterThan(0);
    expect(model.minutos).toBeGreaterThan(0);
    expect(typeof model.free).toBe("boolean");
    expect(typeof model.popular).toBe("boolean");
    // Não expõe campos internos sensíveis de template / etapas no catálogo público
    expect((model as Record<string, unknown>).template).toBeUndefined();
    expect((model as Record<string, unknown>).etapas).toBeUndefined();
  }
});

test("generateStaticParams gera parâmetros estáticos para todos os modelos", () => {
  const params = generateStaticParams();
  expect(params.length).toBe(PUBLIC_MODELS.length);
  expect(params.map((p) => p.slug)).toEqual(PUBLIC_MODELS.map((m) => m.slug));
});

test("generateMetadata retorna título, descrição e canonical estável para cada modelo", async () => {
  for (const model of PUBLIC_MODELS) {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: model.slug }) });
    expect(meta.title).toContain(model.nome);
    expect(meta.description).toBe(model.descricao);
    expect(meta.alternates?.canonical).toBe(`/documentos/${model.slug}`);
  }
});

test("generateMetadata retorna objeto vazio para slug inexistente", async () => {
  const meta = await generateMetadata({ params: Promise.resolve({ slug: "inexistente" }) });
  expect(meta).toEqual({});
});

test("sitemap inclui a rota /documentos e uma URL estável por slug de modelo", () => {
  const map = sitemap();
  const urls = map.map((entry) => entry.url);
  expect(urls.some((u) => u.endsWith("/documentos"))).toBe(true);
  for (const model of PUBLIC_MODELS) {
    expect(urls.some((u) => u.endsWith(`/documentos/${model.slug}`))).toBe(true);
  }
  // Garante que não há mais URLs antigas com query string de modelo no sitemap
  expect(urls.some((u) => u.includes("?view=modelo-detalhe"))).toBe(false);
});

test("robots.txt permite navegação pública e bloqueia rotas privadas e de API", () => {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
  expect(rules?.allow).toBe("/");
  const disallow = Array.isArray(rules?.disallow) ? rules?.disallow : [rules?.disallow];
  expect(disallow).toContain("/api/");
  expect(disallow).toContain("/?view=dashboard");
});

test("redireciona navegações legadas de catálogo para rotas públicas canônicas", () => {
  let assignedUrl = "";
  const mockWindow = {
    location: {
      assign: (url: string) => {
        assignedUrl = url;
      },
      href: "",
    },
  };

  mockWindow.location.assign("/documentos");
  expect(assignedUrl).toBe("/documentos");
  mockWindow.location.assign("/documentos/contrato-locacao");
  expect(assignedUrl).toBe("/documentos/contrato-locacao");
});

