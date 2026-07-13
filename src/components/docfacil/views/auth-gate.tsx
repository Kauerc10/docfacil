"use client";

import { Lock, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNav } from "@/components/docfacil/nav-context";

/**
 * AuthGate — wraps a protected view and decides what to render:
 *
 * - `loading`        → friendly skeleton (pulsing card placeholders)
 * - `!user`          → login prompt with CTA buttons → navigate("login" | "cadastro")
 * - `user` present   → renders `children` (the real view content)
 *
 * The skeleton/prompt include the same top padding (72px) that PageShell uses,
 * so the fixed header never overlaps them.
 *
 * Usage:
 *   <AuthGate>
 *     <PageShell>...view...</PageShell>
 *   </AuthGate>
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { navigate } = useNav();

  if (loading) {
    return <GateSkeleton />;
  }

  if (!user) {
    return (
      <div className="pt-[72px] min-h-[calc(100vh-72px)] bg-paper">
        <div className="max-w-md mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
          <div
            className="mx-auto w-16 h-16 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)] grid place-items-center"
            aria-hidden="true"
          >
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold text-ink tracking-tight text-balance">
            Faça login para ver seus documentos
          </h1>
          <p className="mt-3 text-ink/65 text-base leading-relaxed text-pretty">
            Entre na sua conta para acessar seus documentos, perfil e
            histórico de pagamentos.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate("login")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--blue-royal)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--navy)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => navigate("cadastro")}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-surface px-6 py-3 text-sm font-semibold text-ink hover:bg-paper transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
            >
              Criar conta grátis
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Skeleton shown while the auth state resolves (mainly Firebase mode). */
function GateSkeleton() {
  return (
    <div className="pt-[72px] min-h-[calc(100vh-72px)] bg-paper">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16" aria-hidden="true">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[var(--blue-soft)]/50 rounded w-24" />
          <div className="h-9 bg-[var(--blue-soft)]/50 rounded w-2/3" />
          <div className="h-4 bg-[var(--blue-soft)]/40 rounded w-1/2" />
        </div>
        <div className="mt-10 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-[var(--blue-soft)]/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
