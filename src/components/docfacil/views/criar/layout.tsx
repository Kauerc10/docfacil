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
  /** navega para uma etapa anterior (só permite índices <= step atual) */
  onStepClick?: (targetStep: number) => void;
  children: React.ReactNode;
}

/**
 * CriarLayout — shell do fluxo /criar.
 *
 * - Top bar: Voltar + progress bar + step counter
 * - Chat único, sem distrações, para o MVP
 * - A infraestrutura de prévia fica disponível fora da interface até ser estabilizada
 */
export function CriarLayout({
  step,
  total,
  progressPct,
  pulseProgress = false,
  onVoltar,
  onStepClick,
  children,
}: CriarLayoutProps) {
  // Stepper dots: apenas para fluxos com 3+ etapas.
  // Permite clicar em etapas já visitadas (<= step atual) para revisar;
  // etapas futuras não são clicáveis (não foram preenchidas).
  const showStepper = total >= 3 && onStepClick;
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
          {showStepper && (
            <div className="mt-2 flex items-center gap-1.5">
              {Array.from({ length: total }, (_, i) => {
                const isCurrent = i === step;
                const isPast = i < step;
                const clickable = i <= step;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && onStepClick!(i)}
                    aria-label={`Ir para a etapa ${i + 1}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "h-2 flex-1 max-w-[2.5rem] rounded-full transition-all",
                      isCurrent
                        ? "bg-[var(--blue-royal)] scale-y-125"
                        : isPast
                        ? "bg-[var(--selo-green)]/70 hover:bg-[var(--selo-green)] cursor-pointer"
                        : "bg-[var(--border)] cursor-not-allowed"
                    )}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 bg-paper">
        <div
          className="w-full max-w-3xl mx-auto p-6 sm:p-8 lg:p-10 flex flex-col gap-5 min-h-[60vh]"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
