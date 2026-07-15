import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { LegalPageWrapper } from "@/lib/legal/legal-page-wrapper";
import { TermsContent } from "@/lib/legal/terms-content";

/**
 * /termos — Termos de Uso (server-rendered, crawlable).
 *
 * Conteúdo extraído em `src/lib/legal/terms-content.tsx` e compartilhado com a
 * SPA (`termos-view.tsx`). Wrapper visual via `LegalPageWrapper`.
 */
export const metadata: Metadata = {
  title: `Termos de Uso — ${COMPANY.productName}`,
  description:
    "Termos de Uso da plataforma DocFacil. Regras claras para usar o serviço, sem juridiquês.",
  alternates: { canonical: "/termos" },
  openGraph: {
    title: `Termos de Uso — ${COMPANY.productName}`,
    description:
      "Regras claras para usar o DocFacil: pagamentos, reembolso, responsabilidade e arbitragem.",
    type: "article",
    locale: "pt_BR",
  },
};

export default function TermosPage() {
  return (
    <LegalPageWrapper
      title="Termos de Uso"
      subtitle="As regras claras para usar o DocFacil. Sem juridiquês, mas com validade."
      lastUpdated="13 de julho de 2026"
      version="1.0"
    >
      <TermsContent />
    </LegalPageWrapper>
  );
}
