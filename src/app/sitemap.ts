/**
 * Sitemap dinâmico do DocFacil.
 * Gera /sitemap.xml em runtime com todas as rotas públicas.
 *
 * Inclui:
 *  - Home (/) — prioridade máxima.
 *  - Rotas estáticas file-based (/termos, /privacidade, /cookies, /planos,
 *    /ajuda) — server-rendered, crawlable, com metadata própria.
 *  - Rotas de catálogo de modelos (/?view=modelo-detalhe&slug=…) — SPA, mas
 *    com conteúdo dinâmico por modelo (deep linkable).
 *  - Entradas SPA auxiliares (/?view=modelos, etc.).
 */
import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";
import { MODELOS } from "@/lib/modelos";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = COMPANY.url;

  // Rotas estáticas file-based (server-rendered, alta prioridade de SEO).
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/planos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/ajuda`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/termos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/privacidade`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // Views SPA via query string (crawlable, mas sem SSR próprio).
    {
      url: `${base}/?view=modelos`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Rotas dinâmicas: uma entrada por modelo do catálogo (deep link).
  // Conteúdo distinto por slug, relevante para buscas por tipo de documento.
  const modelRoutes: MetadataRoute.Sitemap = MODELOS.map((modelo) => ({
    url: `${base}/?view=modelo-detalhe&slug=${modelo.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...modelRoutes];
}
