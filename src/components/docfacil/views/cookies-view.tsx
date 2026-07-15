"use client";

import { LegalLayout } from "./legal-layout";
import { CookiesContent } from "@/lib/legal/cookies-content";

/**
 * CookiesView — Política de Cookies (versão SPA, `?view=cookies`).
 *
 * O conteúdo real vive em `@/lib/legal/cookies-content` (compartilhado com a
 * rota estática `/cookies`). Aqui fornecemos apenas o wrapper `LegalLayout`.
 * O botão "Reabrir preferências" já está embutido no conteúdo compartilhado.
 */
export function CookiesView() {
  return (
    <LegalLayout
      title="Política de Cookies"
      subtitle="Como e por que usamos cookies. Você escolhe o que aceitar."
      lastUpdated="13 de julho de 2026"
      version="1.0"
    >
      <CookiesContent />
    </LegalLayout>
  );
}
