"use client";

import { ArrowRight } from "lucide-react";
import { Selo } from "../../selo";

/**
 * CriarLoading — skeleton do split-screen do /criar.
 *
 * Mantém o layout medido (top bar + coluna chat + folha A4 pulsando) pra
 * evitar "pulo" quando o modelo carrega. Usa a paleta brand (blue-soft,
 * selo-green, ink).
 */
export function CriarLoading() {
  return (
    <div
      className="min-h-screen pt-[72px] flex flex-col bg-paper"
      role="status"
      aria-busy="true"
      aria-label="Carregando modelo"
    >
      {/* Top bar skeleton */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-[var(--border)] bg-paper">
        <div className="max-w-7xl mx-auto">
          <div className="h-4 w-24 rounded-md bg-[var(--blue-soft)]/60 animate-pulse" />
          <div className="mt-3 h-2 w-full rounded-full bg-[var(--blue-soft)] overflow-hidden">
            <div className="h-full w-0 bg-[var(--selo-green)]" />
          </div>
        </div>
      </div>

      {/* Split screen skeleton */}
      <div className="flex-1 lg:grid lg:grid-cols-[45%_55%]">
        <div className="bg-paper p-6 sm:p-8 lg:p-10 flex flex-col gap-5 min-h-[60vh] lg:min-h-0 animate-pulse">
          <div className="mt-auto space-y-4">
            <div className="flex gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--blue-soft)]" />
              <div className="bg-surface border border-[var(--border)] rounded-2xl px-5 py-3.5 max-w-[85%]">
                <div className="h-4 w-56 rounded-md bg-[var(--blue-soft)]/70" />
              </div>
            </div>
            <div className="h-14 w-full rounded-xl bg-[var(--blue-soft)]/50" />
            <div className="h-12 w-40 rounded-xl bg-[var(--blue-royal)]/40" />
          </div>
        </div>
        <div className="hidden lg:grid bg-[#efe9dd] p-8 place-items-center min-h-[60vh]">
          <div className="w-full max-w-[340px] aspect-[1/1.414] bg-white rounded-sm shadow-[0_20px_40px_-20px_rgba(14,35,64,0.3)] p-6 animate-pulse space-y-3">
            <div className="h-3 w-32 mx-auto rounded bg-[var(--blue-soft)]/70" />
            <div className="h-px bg-ink/10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-2.5 rounded bg-[var(--blue-soft)]/55"
                style={{ width: `${70 + ((i * 11) % 25)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CriarModeloNaoEncontrado — fallback quando getModel(slug) retorna null.
 *
 * Mostra o selo da marca, mensagem amigável, e um CTA pro catálogo.
 */
export function CriarModeloNaoEncontrado({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="min-h-[70vh] pt-[72px] grid place-items-center px-4">
      <div className="text-center max-w-md">
        <Selo variant="mark" className="w-10 h-10 mx-auto" />
        <h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-2xl font-bold text-ink">
          Modelo não encontrado
        </h2>
        <p className="mt-2 text-ink/65">
          O documento que você procura não está disponível agora. Explore
          nosso catálogo completo.
        </p>
        <button
          type="button"
          onClick={onVoltar}
          className="mt-6 inline-flex items-center justify-center h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] transition-colors"
        >
          Ver todos os modelos
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
