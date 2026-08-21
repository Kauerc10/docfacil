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
  /** callback do botão Voltar */
  onVoltar: () => void;
  children: React.ReactNode;
}

/** Shell enxuto do fluxo /criar: uma única leitura de progresso e o chat. */
export function CriarLayout({
  step,
  total,
  progressPct,
  pulseProgress = false,
  onVoltar,
  children,
}: CriarLayoutProps) {
  const safeProgress = Math.max(0, Math.min(progressPct, 100));

  return (
    <div className="min-h-screen pt-[72px] flex flex-col bg-paper">
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
          <div
            className="mt-3 h-2 w-full rounded-full bg-[var(--blue-soft)] overflow-hidden"
            role="progressbar"
            aria-label="Progresso do documento"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(safeProgress)}
          >
            <div
              className={cn(
                "h-full bg-[var(--selo-green)] transition-[width] duration-500 ease-out rounded-full",
                pulseProgress && "progress-pulse"
              )}
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        </div>
      </div>

      <main className="flex-1 bg-paper">
        <div className="w-full max-w-3xl mx-auto p-6 sm:p-8 lg:p-10 flex flex-col gap-5 min-h-[60vh]">
          {children}
        </div>
      </main>
    </div>
  );
}
