"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizarEstado } from "@/lib/normalizers";
import type { CampoPerguntaProps } from "./types";

gsap.registerPlugin(useGSAP);

/**
 * CampoPergunta — input para uma única pergunta do fluxo Concierge.
 *
 * - Border-2 + shadow on focus (visualmente "eleva" o campo ativo)
 * - Animação `campoIn` (fade + slide-up) ao montar
 * - Enter avança (Shift+Enter quebra linha no textarea)
 * - Microcopy com bullet (•) em pen-note green
 * - Erro visível com shake (GSAP elastic) + borda coral
 * - Auto-normaliza "estado" no blur (SP, São Paulo, sp → SP)
 *
 * Nota: usamos dois refs separados (inputRef + textareaRef) pra evitar o
 * callback ref `ref.current = el` que dispara o lint rule
 * `react-hooks/immutability` quando o mesmo ref é lido dentro de useEffect.
 * Cada ref é passado direto via `ref={...}` (sem callback).
 */
export function CampoPergunta({
  campo,
  value,
  onChange,
  onAvancar,
  submitting = false,
  isLast = false,
  erro = null,
}: CampoPerguntaProps) {
  const root = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mount: animation campoIn (fade + slide-up).
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!root.current) return;
      gsap.fromTo(
        root.current,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.42, ease: "power3.out", delay: 0.05 }
      );
    },
    { scope: root }
  );

  // Shake when erro appears/toggles.
  const erroPrev = useRef<string | null>(null);
  useEffect(() => {
    if (erro && erro !== erroPrev.current) {
      const el = textareaRef.current ?? inputRef.current;
      if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.4)" });
      }
    }
    erroPrev.current = erro;
  }, [erro]);

  // Auto-focus on mount.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const el = textareaRef.current ?? inputRef.current;
      el?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAvancar();
    }
  };

  const handleBlur = () => {
    // Auto-normaliza estado no blur (SP, São Paulo, sp → SP)
    if (/estado|uf/i.test(campo.key) || /estado|uf/i.test(campo.pergunta)) {
      const normalizado = normalizarEstado(value);
      if (normalizado !== value) onChange(normalizado);
    }
  };

  const isTextarea = campo.tipo === "textarea";
  const inputMode = campo.tipo === "number" ? "decimal" : "text";

  return (
    <div ref={root} className="space-y-2" style={{ animation: "campoIn 0.42s cubic-bezier(0.22,1,0.36,1)" }}>
      <style>{`@keyframes campoIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {isTextarea ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={campo.placeholder}
          aria-label={campo.pergunta}
          aria-invalid={!!erro}
          rows={3}
          disabled={submitting}
          className={cn(
            "w-full min-h-[3.5rem] px-4 py-3 text-xl rounded-xl bg-surface border-2 outline-none transition-all resize-none disabled:opacity-60 placeholder:text-ink/40",
            "focus:shadow-[0_8px_24px_-12px_rgba(37,84,199,0.45)]",
            erro
              ? "border-[var(--coral)] focus:border-[var(--coral)]"
              : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]"
          )}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={campo.placeholder}
          aria-label={campo.pergunta}
          aria-invalid={!!erro}
          inputMode={inputMode}
          disabled={submitting}
          className={cn(
            "w-full h-14 px-4 text-xl rounded-xl bg-surface border-2 outline-none transition-all disabled:opacity-60 placeholder:text-ink/40",
            "focus:shadow-[0_8px_24px_-12px_rgba(37,84,199,0.45)]",
            erro
              ? "border-[var(--coral)] focus:border-[var(--coral)]"
              : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]"
          )}
        />
      )}

      {erro && (
        <p className="text-sm text-[var(--coral)] font-medium pl-1 flex items-center gap-1.5">
          <span aria-hidden="true">⚠</span>
          {erro}
        </p>
      )}

      {campo.microcopy && !erro && (
        <p className="pen-note text-sm pl-1 flex items-start gap-1.5">
          <span aria-hidden="true" className="text-[var(--selo-green)] mt-px">•</span>
          <span>{campo.microcopy}</span>
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
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
        <kbd className="hidden sm:inline-flex text-xs text-ink/45 px-2 py-1.5 rounded border border-[var(--border)]">
          Enter ↵
        </kbd>
      </div>
    </div>
  );
}
