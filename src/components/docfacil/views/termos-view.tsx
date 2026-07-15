"use client";

import { LegalLayout } from "./legal-layout";
import { TermsContent } from "@/lib/legal/terms-content";
import { useNav, type View } from "../nav-context";

/**
 * TermosView — Termos de Uso (versão SPA, montada dentro de `?view=termos`).
 *
 * O conteúdo real vive em `@/lib/legal/terms-content` (compartilhado com a
 * rota estática `/termos`). Aqui apenas fornecemos o wrapper `LegalLayout`
 * (client, com botão "Voltar" via `navigate()`) e passamos o `onNavigate`
 * para que os links internos (Privacidade, Cookies) naveguem via SPA.
 */
export function TermosView() {
  const { navigate } = useNav();

  return (
    <LegalLayout
      title="Termos de Uso"
      subtitle="As regras claras para usar o DocFacil. Sem juridiquês, mas com validade."
      lastUpdated="13 de julho de 2026"
      version="1.0"
    >
      <TermsContent onNavigate={(v) => navigate(v as View)} />
    </LegalLayout>
  );
}
