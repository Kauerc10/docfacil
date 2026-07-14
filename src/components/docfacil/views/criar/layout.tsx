"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CriarLayoutProps {
  /** índice atual (0-based) */
  step: number;
  /** total de etapas */
  total: number;
  /** % preenchida (0-100) */
  progressPct: number;
  /** true quando queremos o efeito progress-pulse */
  pulseProgress?: boolean;
  /** aba ativa no mobile */
  mobileTab: "perguntas" | "visualizar";
  onMobileTabChange: (tab: "perguntas" | "visualizar") => void;
  /** callback do botão Voltar */
  onVoltar: () => void;
  children: React.ReactNode;
  /** conteúdo da coluna direita (preview) */
  previewSlot: React.ReactNode;
}

/**
 * CriarLayout — shell do fluxo /criar.
 *
 * - Top bar: Voltar + progress bar + step counter
 * - Mobile tabs: Perguntas / Visualizar
 * - Split screen grid (45% / 55%) no desktop
 *
 * Mobile tabs usam opacity/absolute em vez de `hidden` para evitar problemas
 * de dimensão com o preview (que precisa estar sempre medido pra paginação).
 */
export function CriarLayout({
  step,
  total,
  progressPct,
  pulseProgress = false,
  mobileTab,
  onMobileTabChange,
  onVoltar,
  children,
  previewSlot,
}: CriarLayoutProps) {
  return (
    <div className="min-h-screen pt-[72px] flex flex-col bg-paper">
      {/* === Top bar === */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-[var(--border)] bg-paper">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onVoltar}
              className="inline-flex items-center gap-1 text-sm font-semibold text-ink/65 hover:text-[var(--blue-royal)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <span className="ml-auto text-sm font-medium text-ink/60">
              passo{" "}
              <span className="text-ink font-bold">
                {Math.min(step + 1, total)}
              </span>{" "}
              de {total}
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-[var(--blue-soft)] overflow-hidden">
            <div
              className={cn(
                "h-full bg-[var(--selo-green)] transition-[width] duration-500 ease-out rounded-full",
                pulseProgress && "progress-pulse"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* === Mobile tabs === */}
      <div className="lg:hidden flex border-b border-[var(--border)] bg-paper sticky top-[72px] z-10">
        {(["perguntas", "visualizar"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onMobileTabChange(t)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold transition-colors border-b-2 capitalize",
              mobileTab === t
                ? "text-[var(--blue-royal)] border-[var(--blue-royal)]"
                : "text-ink/55 border-transparent hover:text-ink"
            )}
          >
            {t === "perguntas" ? "Perguntas" : "Visualizar"}
          </button>
        ))}
      </div>

      {/* === Split screen === */}
      <div className="flex-1 lg:grid lg:grid-cols-[45%_55%] relative">
        {/* Coluna esquerda — perguntas (mobile: absolute quando inativa, pra manter layout medido) */}
        <div
          className={cn(
            "bg-paper p-6 sm:p-8 lg:p-10 flex flex-col gap-5 min-h-[60vh] lg:min-h-0 overflow-y-auto scroll-fine transition-opacity duration-300",
            "lg:!opacity-100 lg:!static lg:!flex",
            mobileTab === "perguntas"
              ? "opacity-100 static flex"
              : "lg:opacity-100 opacity-0 absolute inset-0 pointer-events-none"
          )}
          aria-hidden={mobileTab !== "perguntas"}
        >
          {children}
        </div>

        {/* Coluna direita — preview A4 (mobile: absolute quando inativo) */}
        <div
          className={cn(
            "bg-[#efe9dd] p-6 sm:p-8 grid place-items-center min-h-[60vh] lg:min-h-0 relative transition-opacity duration-300",
            "lg:!opacity-100 lg:!static lg:!grid",
            mobileTab === "visualizar"
              ? "opacity-100 static grid"
              : "lg:opacity-100 opacity-0 absolute inset-0 pointer-events-none"
          )}
          aria-hidden={mobileTab !== "visualizar"}
        >
          {previewSlot}
        </div>
      </div>
    </div>
  );
}
