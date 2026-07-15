"use client";

import { LegalLayout } from "./legal-layout";
import { PrivacyContent } from "@/lib/legal/privacy-content";
import { useNav, type View } from "../nav-context";

/**
 * PrivacidadeView — Política de Privacidade (versão SPA, `?view=privacidade`).
 *
 * O conteúdo real vive em `@/lib/legal/privacy-content` (compartilhado com a
 * rota estática `/privacidade`). Aqui fornecemos o wrapper `LegalLayout` e o
 * `onNavigate` para os links internos navegarem via SPA.
 */
export function PrivacidadeView() {
  const { navigate } = useNav();

  return (
    <LegalLayout
      title="Política de Privacidade"
      subtitle="Como tratamos seus dados pessoais — em conformidade com a LGPD (Lei nº 13.709/2018)."
      lastUpdated="13 de julho de 2026"
      version="1.0"
    >
      <PrivacyContent onNavigate={(v) => navigate(v as View)} />
    </LegalLayout>
  );
}
