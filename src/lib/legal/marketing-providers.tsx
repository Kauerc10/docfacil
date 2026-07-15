"use client";

import { AuthProvider } from "@/lib/auth-context";
import { NavProvider } from "@/components/docfacil/nav-context";

/**
 * MarketingProviders — wrapper client para rotas file-based estáticas que
 * renderizam views SPA interativas (PlanosView, AjudaView, etc.).
 *
 * As views SPA usam `useNav()` e (algumas) `useAuth()`, que exigem os providers
 * no contexto. Como essas rotas são Server Components na raiz, este wrapper
 * client estabelece o boundary: ele monta o NavProvider (e AuthProvider quando
 * `withAuth` é true) em torno dos children.
 *
 * Comportamento do NavProvider em rotas file-based:
 *  - `navigate("checkout", { plan: "pro" })` → pushState para
 *    `/?view=checkout&plan=pro` (sai da rota estática e vai para a SPA home
 *    com a view correta). O usuário continua na mesma aba, sem recarregar.
 *  - Deep linking / refresh funciona normalmente (a rota estática é a URL real).
 */
export function MarketingProviders({
  children,
  withAuth = false,
}: {
  children: React.ReactNode;
  withAuth?: boolean;
}) {
  const tree = <NavProvider>{children}</NavProvider>;
  return withAuth ? <AuthProvider>{tree}</AuthProvider> : tree;
}
