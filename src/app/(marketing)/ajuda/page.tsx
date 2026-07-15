import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { HELP_FAQS } from "@/lib/legal/faqs";
import { AjudaView } from "@/components/docfacil/views/ajuda-view";
import { MarketingProviders } from "@/lib/legal/marketing-providers";

/**
 * /ajuda — Central de Ajuda (server-rendered para SEO, com JSON-LD FAQPage).
 *
 * A view interativa (`AjudaView`) é um Client Component com busca e accordion.
 * O `MarketingProviders` envolve a view com NavProvider.
 *
 * O JSON-LD `FAQPage` abaixo usa as FAQs de `@/lib/legal/faqs` (compartilhadas
 * com a view SPA), para rich results de FAQ no Google.
 */
export const metadata: Metadata = {
  title: `Central de Ajuda — ${COMPANY.productName}`,
  description:
    "Perguntas frequentes sobre validade jurídica, registro em cartório, pagamentos e cancelamento. Ou fale com a gente no WhatsApp.",
  alternates: { canonical: "/ajuda" },
  openGraph: {
    title: `Central de Ajuda — ${COMPANY.productName}`,
    description:
      "Respostas sobre documentos, validade jurídica e planos. Atendimento humano no WhatsApp, sem robô.",
    type: "website",
    locale: "pt_BR",
  },
};

/**
 * Dados estruturados JSON-LD: FAQPage com todas as perguntas frequentes.
 * Pode renderizar como rich result (accordion diretamente nos resultados do Google).
 */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HELP_FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function AjudaPage() {
  return (
    <>
      {/* JSON-LD FAQPage para rich results no Google. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MarketingProviders>
        <AjudaView />
      </MarketingProviders>
    </>
  );
}
