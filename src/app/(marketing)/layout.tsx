"use client";

import { NavProvider } from "@/components/docfacil/nav-context";
import { Header } from "@/components/docfacil/header";
import { Footer } from "@/components/docfacil/footer";
import { WhatsAppButton } from "@/components/docfacil/whatsapp-button";
import { GsapSafety } from "@/components/docfacil/gsap-safety";
import { CookieBanner } from "@/components/docfacil/cookie-banner";
import { useAnalyticsInit } from "@/hooks/use-analytics-init";

/**
 * Layout das rotas de marketing estáticas (/termos, /privacidade, /cookies,
 * /planos, /ajuda).
 *
 * Envolve as páginas com Header + Footer + WhatsAppButton + CookieBanner,
 * espelhando o layout da home (em `src/app/page.tsx`). O `NavProvider` é
 * necessário porque Header e Footer usam `useNav()` para navegação SPA.
 *
 * É um Client Component porque Header/Footer/NavProvider dependem de estado
 * e hooks do browser (GSAP, scroll listener, etc.). As páginas filhas ainda
 * podem exportar `metadata`? Não — páginas filhas de um layout client NÃO
 * podem exportar `metadata`. Por isso a metadata é definida via um servidor
 * `page.tsx` wrapper que delega para componentes client (ver cada página).
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAnalyticsInit();
  return (
    <NavProvider>
      <div className="relative min-h-screen flex flex-col bg-paper">
        <GsapSafety />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
        <CookieBanner />
      </div>
    </NavProvider>
  );
}
