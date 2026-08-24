"use client";

import type React from "react";
import { ArrowLeft } from "lucide-react";
import { Pet } from "@/components/docfacil/pet";
import type { Modelo } from "@/lib/types";

interface CriarLayoutProps {
  modelo?: Modelo;
  step: number;
  total: number;
  progressPct: number;
  onVoltar: () => void;
  onStepClick?: (step: number) => void;
  children: React.ReactNode;
}

export function CriarLayout({
  modelo,
  step,
  total,
  progressPct,
  onVoltar,
  onStepClick,
  children,
}: CriarLayoutProps) {
  const nome = modelo?.nome ?? "Documento";
  const pct = Math.max(0, Math.min(100, progressPct));

  const handleVoltar = () => {
    if (step > 0 && onStepClick) {
      onStepClick(step - 1);
      return;
    }

    onVoltar();
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleVoltar}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-ink/70 transition-colors hover:bg-[var(--blue-soft)] hover:text-[var(--blue-royal)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-bold text-ink sm:text-base">{nome}</p>
              <span className="shrink-0 text-xs font-semibold text-ink/45">
                passo {Math.min(step + 1, Math.max(total, 1))} de {Math.max(total, 1)}
              </span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--blue-soft)]"
              role="progressbar"
              aria-label="Progresso do documento"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
              <div
                className="h-full rounded-full bg-[var(--blue-royal)] transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-center gap-2.5 sm:mb-7">
          <Pet size={38} state="idle" />
          <div>
            <p className="text-sm font-bold text-ink">Assistente DocFacil</p>
            <p className="text-xs text-ink/50">uma etapa por vez</p>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
