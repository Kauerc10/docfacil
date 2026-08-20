"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizarEstado } from "@/lib/normalizers";
import type { CampoPerguntaProps } from "./types";
import { useCampoValidado } from "./use-campo-validado";
import { ListaPessoas } from "./lista-pessoas";

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
  const selectRef = useRef<HTMLSelectElement>(null);

  // Máscara + validação determinística (CPF/CNPJ/CEP/telefone/data).
  // erroLocal = erro de formato/dígito (validação interna).
  // erro (prop) = erro de obrigatório (vindo do CriarView quando tenta avançar vazio).
  // Exibimos erroLocal primeiro; se não houver, mostramos o erro do parent.
  const { tipo, erro: erroLocal, handleChange, handleBlur } = useCampoValidado(campo, value, onChange);
  const erroExibido = erroLocal ?? erro;

  // Mount: animação de entrada suave (fade + slide-up + scale leve).
  // Mais amigável que a animação anterior — eased spring-like curve.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!root.current) return;
      const tl = gsap.timeline();
      tl.fromTo(
        root.current,
        { y: 18, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.42, ease: "power3.out" }
      );
      // label + input + microcopy entram em stagger sutil
      tl.fromTo(
        root.current.querySelectorAll("[data-campo='el']"),
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.32, ease: "power3.out", stagger: 0.06 },
        "-=0.18"
      );
    },
    { scope: root }
  );

  // Shake when erro appears/toggles.
  const erroPrev = useRef<string | null>(null);
  useEffect(() => {
    if (erro && erro !== erroPrev.current) {
      const el = textareaRef.current ?? inputRef.current ?? selectRef.current;
      if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.4)" });
      }
    }
    erroPrev.current = erro;
  }, [erro]);

  // Auto-focus on mount.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const el = textareaRef.current ?? inputRef.current ?? selectRef.current;
      el?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Valida antes de avançar — se inválido, shake fica no campo e não avança.
      if (!erroLocal) onAvancar();
    }
  };

  const onblurComposto = () => {
    // 1. validação interna do hook (formato/dígito)
    handleBlur();
    // 2. auto-normaliza estado no blur (SP, São Paulo, sp → SP)
    if (/estado|uf/i.test(campo.key) || /estado|uf/i.test(campo.pergunta)) {
      const normalizado = normalizarEstado(value);
      if (normalizado !== value) onChange(normalizado);
    }
  };

  const isTextarea = campo.tipo === "textarea";
  const isSelect = campo.tipo === "select" && campo.opcoes && campo.opcoes.length > 0;
  const inputMode = (campo.tipo === "number" || tipo === "moeda") ? "decimal" : "text";

  if (campo.tipo === "lista_pessoas") {
    return (
      <ListaPessoas
        campo={campo}
        value={value}
        onChange={onChange}
        onAvancar={onAvancar}
        submitting={submitting}
        erro={erro}
      />
    );
  }

  return (
    <div ref={root} className="space-y-2">
      {isTextarea ? (
        <div data-campo="el">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onblurComposto}
            placeholder={campo.placeholder}
            aria-label={campo.pergunta}
            aria-invalid={!!erroExibido}
            rows={3}
            disabled={submitting}
            className={cn(
              "w-full min-h-[3.5rem] px-4 py-3 text-xl rounded-xl bg-surface border-2 outline-none transition-all resize-none disabled:opacity-60 placeholder:text-ink/40",
              "focus:shadow-[0_8px_24px_-12px_rgba(37,84,199,0.45)]",
              erroExibido
                ? "border-[var(--coral)] focus:border-[var(--coral)]"
                : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]"
            )}
          />
        </div>
      ) : isSelect ? (
        <div data-campo="el" className="relative">
          <select
            ref={selectRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onblurComposto}
            aria-label={campo.pergunta}
            aria-invalid={!!erroExibido}
            disabled={submitting}
            className={cn(
              "w-full h-14 pl-4 pr-10 text-xl rounded-xl bg-surface border-2 outline-none transition-all appearance-none disabled:opacity-60 cursor-pointer",
              "focus:shadow-[0_8px_24px_-12px_rgba(37,84,199,0.45)]",
              erroExibido
                ? "border-[var(--coral)] focus:border-[var(--coral)]"
                : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]",
              !value && "text-ink/40"
            )}
          >
            <option value="" disabled>
              {campo.placeholder ?? "Selecione uma opção…"}
            </option>
            {campo.opcoes!.map((op) => (
              <option key={op} value={op} className="text-ink">
                {op}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/50 pointer-events-none"
            aria-hidden="true"
          />
        </div>
      ) : (
        <div data-campo="el" className="relative">
          <input
            ref={inputRef}
            type={tipo === "numero" ? "text" : "text"}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onblurComposto}
            placeholder={campo.placeholder}
            aria-label={campo.pergunta}
            aria-invalid={!!erroExibido}
            inputMode={inputMode}
            disabled={submitting}
            className={cn(
              "w-full h-14 px-4 text-xl rounded-xl bg-surface border-2 outline-none transition-all disabled:opacity-60 placeholder:text-ink/40",
              "focus:shadow-[0_8px_24px_-12px_rgba(37,84,199,0.45)]",
              erroExibido
                ? "border-[var(--coral)] focus:border-[var(--coral)]"
                : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]"
            )}
          />
        </div>
      )}

      {erroExibido && (
        <p data-campo="el" className="text-sm text-[var(--coral)] font-medium pl-1 flex items-center gap-1.5">
          <span aria-hidden="true">⚠</span>
          {erroExibido}
        </p>
      )}

      {campo.microcopy && !erroExibido && (
        <p data-campo="el" className="pen-note text-sm pl-1 flex items-start gap-1.5">
          <span aria-hidden="true" className="text-[var(--selo-green)] mt-px">•</span>
          <span>{campo.microcopy}</span>
        </p>
      )}

      <div data-campo="el" className="mt-3 flex items-center gap-3">
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
