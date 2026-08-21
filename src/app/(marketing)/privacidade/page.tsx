import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { LegalPageWrapper } from "@/lib/legal/legal-page-wrapper";
import { PrivacyContent } from "@/lib/legal/privacy-content";
import { PRIVACY_VERSION } from "@/lib/legal/versions";

/**
 * /privacidade — Política de Privacidade (LGPD), server-rendered.
 *
 * Conteúdo em `src/lib/legal/privacy-content.tsx`, compartilhado com a SPA.
 */
export const metadata: Metadata = {
  title: `Política de Privacidade — ${COMPANY.productName}`,
  description:
    "Como o DocFacil trata seus dados pessoais, em conformidade com a LGPD (Lei nº 13.709/2018).",
  alternates: { canonical: "/privacidade" },
  openGraph: {
    title: `Política de Privacidade — ${COMPANY.productName}`,
    description:
      "Conformidade com a LGPD: dados coletados, bases legais, direitos do titular e segurança.",
    type: "article",
    locale: "pt_BR",
  },
};

export default function PrivacidadePage() {
  return (
    <LegalPageWrapper
      title="Política de Privacidade"
      subtitle="Como tratamos seus dados pessoais — em conformidade com a LGPD (Lei nº 13.709/2018)."
      lastUpdated="13 de julho de 2026"
      version={PRIVACY_VERSION}
    >
      <PrivacyContent />
    </LegalPageWrapper>
  );
}
