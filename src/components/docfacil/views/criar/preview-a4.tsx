"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Selo } from "../../selo";
import { renderDocument } from "@/lib/document-engine";
import type { LinhaQuebrada } from "@/lib/document-engine";
import type { Modelo } from "@/lib/types";
import type { PreviewA4Props } from "./types";

const LINHAS_POR_PAGINA = 20;
const CHARS_POR_LINHA = 76;

/** Marcadores de estilo que podem aparecer no template (espelhado do engine). */
type TipoLinha = "heading1" | "heading2" | "paragraph" | "signature" | "witness" | "empty";

/**
 * PreviewA4 — prévia A4 ao vivo com paginação flip 3D CSS.
 *
 * Refatorado para usar o motor em `lib/document-engine/` (single source of
 * truth para preenchimento + classificação + paginação). Mudou alguma regra
 * de renderização? Muda no motor, todos os renderers acompanham.
 *
 * - Pagina automaticamente em páginas de 20 linhas (após wrapping)
 * - Formatação hierárquica: heading1, heading2, paragraph, signature, witness
 * - Navegação: dots + setas laterais. Flip 3D via CSS perspective + rotateY.
 * - Badge "ao vivo" no canto superior direito.
 * - Selo marca d'água no fundo.
 */
export function PreviewA4({
  titulo,
  corpo,
  respostas,
  clausulasSelecionadas = [],
  modelo,
  camposOpcionais = [],
  docId,
  showLiveBadge = true,
  showWatermark = true,
  className,
}: PreviewA4Props) {
  const [pagina, setPagina] = useState(0);

  // === Renderização via motor centralizado =================================
  const paginas = useMemo(() => {
    return renderDocument(
      {
        titulo,
        corpo,
        respostas,
        clausulasSelecionadas,
        modelo,
      },
      {
        linhasPorPagina: LINHAS_POR_PAGINA,
        charsPorLinha: CHARS_POR_LINHA,
        camposOpcionais,
      }
    );
  }, [titulo, corpo, respostas, clausulasSelecionadas, modelo, camposOpcionais]);

  // Reset página quando total muda.
  const total = paginas.length;
  if (pagina > total - 1) {
    // ajuste imediato (sem effect)
    setTimeout(() => setPagina(Math.max(0, total - 1)), 0);
  }
  const paginaAtual = Math.min(pagina, total - 1);

  const irAnterior = () => setPagina((p) => Math.max(0, p - 1));
  const irProxima = () => setPagina((p) => Math.min(total - 1, p + 1));

  return (
    <div className={cn("relative", className)}>
      {showLiveBadge && (
        <div className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--green-tint)] border border-[var(--selo-green)]/30 text-[var(--selo-green)] text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--selo-green)] animate-pulse" />
          ao vivo
        </div>
      )}

      <div
        className="relative w-full aspect-[1/1.414] mx-auto"
        style={{ perspective: "1400px" }}
      >
        {/* Container flip */}
        <div
          className="relative w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {paginas.map((pag, idx) => {
            const ativa = idx === paginaAtual;
            const isPast = idx < paginaAtual;
            return (
              <div
                key={idx}
                aria-hidden={!ativa}
                className={cn(
                  "absolute inset-0 transition-all duration-700 ease-out",
                  ativa
                    ? "opacity-100 rotate-y-0 z-10"
                    : isPast
                    ? "opacity-0 -rotate-y-90 -z-10"
                    : "opacity-0 rotate-y-90 -z-10"
                )}
                style={{
                  transform: ativa
                    ? "rotateY(0deg)"
                    : isPast
                    ? "rotateY(-90deg)"
                    : "rotateY(90deg)",
                  transformOrigin: "left center",
                  backfaceVisibility: "hidden",
                }}
              >
                <PaginaSheet
                  linhas={pag.linhas}
                  showWatermark={showWatermark}
                  docId={docId}
                  numeroPagina={idx + 1}
                  totalPaginas={total}
                />
              </div>
            );
          })}
        </div>

        {/* Setas laterais */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={irAnterior}
              disabled={paginaAtual === 0}
              aria-label="Página anterior"
              className="absolute left-1 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-surface/95 border border-[var(--border)] shadow-md text-ink/70 hover:text-[var(--blue-royal)] hover:border-[var(--blue-royal)]/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={irProxima}
              disabled={paginaAtual === total - 1}
              aria-label="Próxima página"
              className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-surface/95 border border-[var(--border)] shadow-md text-ink/70 hover:text-[var(--blue-royal)] hover:border-[var(--blue-royal)]/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {paginas.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPagina(idx)}
              aria-label={`Ir para página ${idx + 1}`}
              aria-current={idx === paginaAtual}
              className={cn(
                "transition-all rounded-full",
                idx === paginaAtual
                  ? "w-6 h-2 bg-[var(--blue-royal)]"
                  : "w-2 h-2 bg-ink/20 hover:bg-ink/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Uma única folha A4 (uma página do documento). */
function PaginaSheet({
  linhas,
  showWatermark,
  docId,
  numeroPagina,
  totalPaginas,
}: {
  linhas: LinhaQuebrada[];
  showWatermark: boolean;
  docId?: string;
  numeroPagina: number;
  totalPaginas: number;
}) {
  return (
    <div className="relative w-full h-full bg-white rounded-sm shadow-[0_20px_40px_-20px_rgba(14,35,64,0.3)] overflow-hidden ring-1 ring-black/5">
      {showWatermark && <Selo variant="watermark" />}

      <div className="relative h-full px-6 py-8 flex flex-col">
        {docId && numeroPagina === 1 && (
          <p className="text-[0.55rem] uppercase tracking-[0.2em] text-ink/40 font-semibold">
            DocFacil · ID {docId}
          </p>
        )}

        <div className="flex-1 space-y-2.5 overflow-hidden">
          {linhas.map((linha, i) => (
            <Linha key={i} tipo={linha.tipo as TipoLinha} texto={linha.texto} />
          ))}
        </div>

        {/* Footer com paginação */}
        <div className="mt-3 pt-2 border-t border-ink/10 flex items-center justify-between text-[0.5rem] text-ink/40 uppercase tracking-wider">
          <span>DocFacil</span>
          <span>
            pág. {numeroPagina}/{totalPaginas}
          </span>
        </div>
      </div>
    </div>
  );
}

function Linha({ tipo, texto }: { tipo: TipoLinha; texto: string }) {
  switch (tipo) {
    case "heading1":
      return (
        <p className="font-[family-name:var(--font-jakarta)] text-sm font-extrabold text-[var(--navy)] uppercase tracking-tight text-center leading-tight">
          {texto}
        </p>
      );
    case "heading2":
      return (
        <p className="font-[family-name:var(--font-jakarta)] text-xs font-bold text-ink uppercase tracking-wide leading-tight">
          {texto}
        </p>
      );
    case "signature":
      return (
        <p className="font-mono text-[0.65rem] text-ink/85 leading-relaxed">
          {texto}
        </p>
      );
    case "witness":
      return (
        <p className="italic text-[0.65rem] text-ink/75 leading-relaxed text-pretty">
          {texto}
        </p>
      );
    case "empty":
      return <p className="text-[0.65rem]">&nbsp;</p>;
    case "paragraph":
    default:
      return (
        <p className="text-[0.65rem] leading-relaxed text-ink/85 text-justify text-pretty">
          {texto}
        </p>
      );
  }
}
