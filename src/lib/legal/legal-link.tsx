"use client";

import Link from "next/link";

/**
 * Mapeia o identificador de view (usado pelo NavProvider SPA) para o path
 * real da rota file-based. Mantido aqui para que o conteúdo legal seja
 * agnóstico ao contexto (SPA ou SSR).
 */
export const LEGAL_PATHS: Record<string, string> = {
  termos: "/termos",
  privacidade: "/privacidade",
  cookies: "/cookies",
  ajuda: "/ajuda",
  planos: "/planos",
  home: "/",
};

/**
 * LegalLink — link interno que funciona em ambos os contextos:
 *
 * - **SSR (rotas file-based):** quando `onNavigate` não é passado, renderiza
 *   um `<Link>` (next/link) para a rota real (`/privacidade`, `/termos`, etc.).
 *   Crawlable, com href real no HTML.
 * - **SPA (views com NavProvider):** quando `onNavigate` é passado, renderiza
 *   um `<button>` que chama `onNavigate(view)` — mantém a navegação SPA sem
 *   recarregar a página.
 *
 * O conteúdo legal (`TermsContent`, `PrivacyContent`, `CookiesContent`) usa
 * este componente internamente, recebendo `onNavigate` apenas quando montado
 * dentro da SPA. Assim, um único source de conteúdo serve para os dois casos.
 */
export function LegalLink({
  view,
  onNavigate,
  children,
  className,
}: {
  view: string;
  onNavigate?: (view: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(view)}
        className={className}
      >
        {children}
      </button>
    );
  }

  const href = LEGAL_PATHS[view] ?? "/";
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
