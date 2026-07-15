"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClausulaCardProps, ClausulasPerguntaProps } from "./types";

gsap.registerPlugin(useGSAP);

/**
 * ClausulasPergunta — lista de cláusulas dinâmicas opcionais.
 *
 * - Entrada staggered GSAP (cada card fade+slide com delay incremental)
 * - Nenhum selecionado por default — usuário opta-in
 * - Botão "Avançar"/"Finalizar" no rodapé
 * - Respeita prefers-reduced-motion
 */
export function ClausulasPergunta({
  clausulas,
  selecionadas,
  extras,
  onToggle,
  onExtraChange,
  onAvancar,
  isLast = false,
  submitting = false,
}: ClausulasPerguntaProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        "[data-cl='card']",
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.42,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.05,
        }
      );
    },
    { scope: root, dependencies: [clausulas.length] }
  );

  return (
    <div ref={root} className="space-y-3">
      {clausulas.map((cl) => (
        <div data-cl="card" key={cl.id}>
          <ClausulaCard
            clausula={cl}
            selecionada={selecionadas.includes(cl.id)}
            extras={extras[cl.id] ?? {}}
            onToggle={(sel) => onToggle(cl.id, sel)}
            onExtraChange={(fieldKey, value) => onExtraChange(cl.id, fieldKey, value)}
          />
        </div>
      ))}

      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onAvancar}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando…
            </>
          ) : (
            <>
              {isLast ? "Finalizar" : "Avançar"}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
        <p className="text-xs text-ink/55">
          {selecionadas.length === 0
            ? "Selecione as cláusulas que deseja incluir (opcional)."
            : `${selecionadas.length} cláusula${selecionadas.length > 1 ? "s" : ""} selecionada${selecionadas.length > 1 ? "s" : ""}.`}
        </p>
      </div>
    </div>
  );
}

/**
 * ClausulaCard — card clicável com checkbox customizado.
 *
 * - Card inteiro é clicável (label implícito via onClick)
 * - Checkbox customizado: quadrado com borda dashed quando vazio,
 *   fundo selo-green + Check quando selecionado
 * - Quando selecionado, `camposExtras` aparecem abaixo com transição suave
 * - stopPropagation no container de extras (pra não re-toggle ao clicar num input)
 */
export function ClausulaCard({
  clausula,
  selecionada,
  extras,
  onToggle,
  onExtraChange,
}: ClausulaCardProps) {
  const handleClick = () => onToggle(!selecionada);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onToggle(!selecionada);
    }
  };

  return (
    <div
      role="checkbox"
      aria-checked={selecionada}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative rounded-2xl border-2 p-4 cursor-pointer transition-all outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]",
        selecionada
          ? "border-[var(--selo-green)] bg-[var(--green-tint)]"
          : "border-[var(--border)] bg-surface hover:border-[var(--blue-royal)]/40 hover:bg-[var(--blue-soft)]/30"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox customizado */}
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 shrink-0 w-6 h-6 rounded-md grid place-items-center transition-all",
            selecionada
              ? "bg-[var(--selo-green)] text-white scale-100"
              : "border-2 border-dashed border-ink/35 group-hover:border-[var(--blue-royal)]/55"
          )}
        >
          {selecionada && <Check className="w-4 h-4" strokeWidth={3} />}
        </span>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-semibold text-ink leading-snug",
              selecionada ? "text-ink" : "text-ink/90"
            )}
          >
            {clausula.titulo}
          </p>
          <p className="mt-1 text-sm text-ink/65 leading-relaxed">{clausula.descricao}</p>
        </div>
      </div>

      {/* Campos extras — só aparecem quando selecionada */}
      {selecionada && clausula.camposExtras && clausula.camposExtras.length > 0 && (
        <div
          className="mt-4 pt-4 border-t border-[var(--selo-green)]/25 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {clausula.camposExtras.map((campo) => (
            <div key={campo.key} className="space-y-1.5">
              <label
                htmlFor={`extra-${clausula.id}-${campo.key}`}
                className="block text-sm font-medium text-ink/75"
              >
                {campo.pergunta}
              </label>
              {campo.tipo === "textarea" ? (
                <textarea
                  id={`extra-${clausula.id}-${campo.key}`}
                  value={extras[campo.key] ?? ""}
                  onChange={(e) => onExtraChange(campo.key, e.target.value)}
                  placeholder={campo.placeholder}
                  rows={2}
                  className="w-full min-h-[3rem] px-3 py-2 text-base rounded-lg bg-surface border-2 border-[var(--blue-soft)] focus:border-[var(--blue-royal)] outline-none transition-all resize-none placeholder:text-ink/40"
                />
              ) : campo.tipo === "select" && campo.opcoes ? (
                <div className="relative">
                  <select
                    id={`extra-${clausula.id}-${campo.key}`}
                    value={extras[campo.key] ?? ""}
                    onChange={(e) => onExtraChange(campo.key, e.target.value)}
                    className={cn(
                      "w-full h-11 pl-3 pr-9 text-base rounded-lg bg-surface border-2 border-[var(--blue-soft)] focus:border-[var(--blue-royal)] outline-none transition-all appearance-none cursor-pointer",
                      !(extras[campo.key] ?? "") && "text-ink/40"
                    )}
                  >
                    <option value="" disabled>
                      {campo.placeholder ?? "Selecione…"}
                    </option>
                    {campo.opcoes.map((op) => (
                      <option key={op} value={op} className="text-ink">
                        {op}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <input
                  id={`extra-${clausula.id}-${campo.key}`}
                  type="text"
                  value={extras[campo.key] ?? ""}
                  onChange={(e) => onExtraChange(campo.key, e.target.value)}
                  placeholder={campo.placeholder}
                  inputMode={campo.tipo === "number" ? "decimal" : "text"}
                  className="w-full h-11 px-3 text-base rounded-lg bg-surface border-2 border-[var(--blue-soft)] focus:border-[var(--blue-royal)] outline-none transition-all placeholder:text-ink/40"
                />
              )}
              {campo.microcopy && (
                <p className="text-xs text-ink/55 italic flex items-start gap-1">
                  <span aria-hidden="true" className="text-[var(--selo-green)] mt-px">•</span>
                  <span>{campo.microcopy}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
