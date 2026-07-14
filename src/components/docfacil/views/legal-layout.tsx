"use client";

import { Selo } from "../selo";
import { useNav } from "../nav-context";
import { COMPANY } from "@/lib/company";

/**
 * LegalLayout — wrapper reutilizável para as 3 views legais (termos, privacidade, cookies).
 * Header com eyebrow, título, versão, data. Botão voltar. Contato no rodapé.
 */
export function LegalLayout({
  title, subtitle, lastUpdated, version, children,
}: {
  title: string; subtitle: string; lastUpdated: string; version: string; children: React.ReactNode;
}) {
  const { navigate } = useNav();
  return (
    <section className="pt-[72px] pb-16 bg-paper min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button onClick={() => navigate("home")} className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink font-medium mb-6 transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Voltar ao início
        </button>
        <div className="bg-[var(--blue-soft)]/30 border border-[var(--blue-royal)]/15 rounded-lg px-4 py-2 mb-6">
          <p className="text-sm text-ink/60">📄 Documento legal · {lastUpdated} · Versão {version}</p>
        </div>
        <h1 className="font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl font-extrabold text-ink tracking-tight mb-3">{title}</h1>
        <p className="text-ink/60 text-lg mb-8">{subtitle}</p>
        <article className="prose prose-lg max-w-none
          [&_h2]:font-[family-name:var(--font-jakarta)] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[var(--navy)] [&_h2]:mt-6 [&_h2]:mb-2
          [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-4 [&_h3]:mb-1
          [&_p]:text-ink/75 [&_p]:leading-relaxed [&_p]:mb-3
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ul]:text-ink/75
          [&_li]:mb-1
          [&_strong]:text-ink [&_strong]:font-semibold
          [&_a]:text-[var(--blue-royal)] [&_a]:underline
        ">
          {children}
        </article>
        <div className="mt-12 pt-6 border-t border-[var(--border)] text-center">
          <p className="text-sm text-ink/50">Em caso de dúvidas sobre este documento, contate:</p>
          <a href={`mailto:${COMPANY.email}`} className="text-[var(--blue-royal)] font-semibold hover:underline">{COMPANY.email}</a>
        </div>
      </div>
    </section>
  );
}
