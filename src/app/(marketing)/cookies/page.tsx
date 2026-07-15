import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { LegalPageWrapper } from "@/lib/legal/legal-page-wrapper";
import { CookiesContent } from "@/lib/legal/cookies-content";

/**
 * /cookies — Política de Cookies (server-rendered).
 *
 * O botão "Reabrir preferências" continua funcional porque o handler só
 * executa no onclick (client-side), mesmo o conteúdo sendo renderizado no
 * servidor.
 */
export const metadata: Metadata = {
  title: `Política de Cookies — ${COMPANY.productName}`,
  description:
    "Como e por que o DocFacil usa cookies. Você escolhe o que aceitar.",
  alternates: { canonical: "/cookies" },
  openGraph: {
    title: `Política de Cookies — ${COMPANY.productName}`,
    description:
      "Tipos de cookies usados (essenciais, analíticos, marketing) e como gerenciar suas preferências.",
    type: "article",
    locale: "pt_BR",
  },
};

export default function CookiesPage() {
  return (
    <LegalPageWrapper
      title="Política de Cookies"
      subtitle="Como e por que usamos cookies. Você escolhe o que aceitar."
      lastUpdated="13 de julho de 2026"
      version="1.0"
    >
      <CookiesContent />
    </LegalPageWrapper>
  );
}
