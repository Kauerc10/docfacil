/**
 * robots.txt dinâmico do DocFacil.
 * Gera /robots.txt em runtime com referência ao sitemap.
 *
 * Substitui o public/robots.txt estático (que não tinha a directive Sitemap).
 * Next.js prioriza este arquivo sobre o estático em app/robots.ts.
 */
import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Bloqueia rotas internas/auth do indexador.
        disallow: ["/api/", "/?view=dashboard", "/?view=perfil", "/?view=checkout", "/?view=documento-detalhe"],
      },
    ],
    sitemap: `${COMPANY.url}/sitemap.xml`,
    host: COMPANY.url,
  };
}
