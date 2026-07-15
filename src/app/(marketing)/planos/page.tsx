import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { PLAN_PRICES, PLAN_FULL_LABELS } from "@/lib/pricing";
import { PlanosView } from "@/components/docfacil/views/planos-view";
import { MarketingProviders } from "@/lib/legal/marketing-providers";

/**
 * /planos — página de preços (server-rendered para SEO, com JSON-LD Product).
 *
 * A view interativa (`PlanosView`) é um Client Component que usa GSAP e
 * `useNav()`. O `MarketingProviders` (client boundary) envolve a view com
 * NavProvider + AuthProvider, permitindo que a navegação continue funcionando
 * (ao clicar em "Assinar Pro", o usuário é levado para `/?view=checkout&plan=pro`).
 *
 * O JSON-LD `Product` abaixo usa os preços reais de `@/lib/pricing` (fonte
 * única de verdade), então uma mudança de preço se propaga automaticamente
 * para os rich results do Google.
 */
export const metadata: Metadata = {
  title: `Planos e Preços — ${COMPANY.productName}`,
  description:
    "Plano Grátis (3 docs/mês), Documento Avulso sem assinatura e Plano Pro ilimitado. Sem fidelidade, cancele quando quiser.",
  alternates: { canonical: "/planos" },
  openGraph: {
    title: `Planos e Preços — ${COMPANY.productName}`,
    description:
      "Grátis, Avulso (R$ 9,90/documento) ou Pro (R$ 24,90/mês, ilimitado). Pix, cartão ou boleto.",
    type: "website",
    locale: "pt_BR",
  },
};

/**
 * Dados estruturados JSON-LD: Product com duas Offers.
 * Preços formatados como string numérica ("9.90") conforme schema.org.
 */
const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${COMPANY.productName} — Planos`,
  description:
    "Plataforma de geração de documentos legais (contratos, declarações, procurações) via chat conversacional.",
  brand: { "@type": "Brand", name: COMPANY.productName },
  offers: [
    {
      "@type": "Offer",
      name: PLAN_FULL_LABELS.avulso,
      price: PLAN_PRICES.avulso.toFixed(2),
      priceCurrency: "BRL",
      description: "Documento avulso, sem assinatura. PDF sem marca d'água.",
      url: `${COMPANY.url}/planos`,
      seller: { "@type": "Organization", name: COMPANY.name },
    },
    {
      "@type": "Offer",
      name: PLAN_FULL_LABELS.pro,
      price: PLAN_PRICES.pro.toFixed(2),
      priceCurrency: "BRL",
      description:
        "Plano Pro mensal: documentos ilimitados, edição e prioridade no atendimento.",
      url: `${COMPANY.url}/planos`,
      seller: { "@type": "Organization", name: COMPANY.name },
    },
  ],
};

export default function PlanosPage() {
  return (
    <>
      {/* JSON-LD Product para rich results de preços no Google. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <MarketingProviders withAuth>
        <PlanosView />
      </MarketingProviders>
    </>
  );
}
