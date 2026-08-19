"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClausulaCardProps, ClausulasPerguntaProps } from "./types";
import { useCampoValidado } from "./use-campo-validado";
import type { CampoModelo } from "@/lib/types";

gsap.registerPlugin(useGSAP);

const RENTAL_GUARANTEE_IDS = new Set([
  "caucao",
  "fiador",
  "seguro_fianca",
  "cessao_fiduciaria",
]);

/**
 * ClausulasPergunta — lista de cláusulas dinâmicas opcionais.
 *
 * Para grupos comuns, mantém seleção múltipla. Quando a etapa contém apenas
 * modalidades de garantia locatícia, a UI muda para escolha única e inclui
 * "Sem garantia" como opção explícita. Assim a regra jurídica fica protegida
 * sem acrescentar uma etapa ou obrigar o usuário a desmarcar a escolha anterior.
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

  const isRentalGuaranteeGroup =
    clausulas.length > 0 &&
    clausulas.every((cl) => RENTAL_GUARANTEE_IDS.has(cl.id));

  const handleToggle = (clausulaId: string, selecionada: boolean) => {
    if (isRentalGuaranteeGroup && selecionada) {
      for (const id of selecionadas.filter(
        (id) => RENTAL_GUARANTEE_IDS.has(id) && id !== clausulaId
      )) {
        onToggle(id, false);
      }
    }
    onToggle(clausulaId, selecionada);
  };

  const handleSemGarantia = () => {
    for (const id of selecionadas.filter((id) => RENTAL_GUARANTEE_IDS.has(id))) {
      onToggle(id, false);
    }
  };

  const semGarantiaSelecionada =
    isRentalGuaranteeGroup &&
    !selecionadas.some((id) => RENTAL_GUARANTEE_IDS.has(id));

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
    <div
      ref={root}
      className="space-y-3"
      role={isRentalGuaranteeGroup ? "radiogroup" : undefined}
      aria-label={isRentalGuaranteeGroup ? "Garantia do aluguel" : undefined}
    >
      {isRentalGuaranteeGroup && (
        <div data-cl="card">
          <div
            role="radio"
            aria-checked={semGarantiaSelecionada}
            tabIndex={0}
            onClick={handleSemGarantia}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                handleSemGarantia();
              }
            }}
            className={cn(
              "group relative rounded-2xl border-2 p-4 cursor-pointer transition-all outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]",
              semGarantiaSelecionada
                ? "border-[var(--selo-green)] bg-[var(--green-tint)]"
                : "border-[var(--border)] bg-surface hover:border-[var(--blue-royal)]/40 hover:bg-[var(--blue-soft)]/30"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 grid place-items-center transition-all",
                  semGarantiaSelecionada
                    ? "border-[var(--selo-green)]"
                    : "border-ink/30 group-hover:border-[var(--blue-royal)]/55"
                )}
              >
                {semGarantiaSelecionada && (
                  <span className="w-3 h-3 rounded-full bg-[var(--selo-green)]" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink leading-snug">Sem garantia</p>
                <p className="mt-1 text-sm text-ink/65 leading-relaxed">
                  O contrato será feito sem caução, fiador ou seguro-fiança.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {clausulas.map((cl) => (
        <div data-cl="card" key={cl.id}>
          <ClausulaCard
            clausula={cl}
            selecionada={selecionadas.includes(cl.id)}
            extras={extras[cl.id] ?? {}}
            singleChoice={isRentalGuaranteeGroup}
            onToggle={(sel) => handleToggle(cl.id, sel)}
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
          {isRentalGuaranteeGroup
            ? "Escolha uma opção. Você pode trocar antes de finalizar."
            : selecionadas.length === 0
              ? "Selecione as cláusulas que deseja incluir (opcional)."
              : `${selecionadas.length} cláusula${selecionadas.length > 1 ? "s" : ""} selecionada${selecionadas.length > 1 ? "s" : ""}.`}
        </p>
      </div>
    </div>
  );
}

/**
 * ClausulaCard — card clicável para cláusula opcional.
 *
 * Em grupos comuns funciona como checkbox. Para garantia locatícia, recebe
 * `singleChoice` e assume semântica/visual de radio, mantendo os campos extras
 * inline para não criar novas etapas no fluxo.
 */
export function ClausulaCard({
  clausula,
  selecionada,
  extras,
  onToggle,
  onExtraChange,
  singleChoice = false,
}: ClausulaCardProps & { singleChoice?: boolean }) {
  const handleClick = () => {
    if (singleChoice && selecionada) return;
    onToggle(!selecionada);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (singleChoice && selecionada) return;
      onToggle(!selecionada);
    }
  };

  return (
    <div
      role={singleChoice ? "radio" : "checkbox"}
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
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 shrink-0 w-6 h-6 grid place-items-center transition-all",
            singleChoice ? "rounded-full border-2" : "rounded-md",
            selecionada && singleChoice
              ? "border-[var(--selo-green)]"
              : selecionada
                ? "bg-[var(--selo-green)] text-white scale-100"
                : singleChoice
                  ? "border-ink/30 group-hover:border-[var(--blue-royal)]/55"
                  : "border-2 border-dashed border-ink/35 group-hover:border-[var(--blue-royal)]/55"
          )}
        >
          {selecionada && singleChoice ? (
            <span className="w-3 h-3 rounded-full bg-[var(--selo-green)]" />
          ) : selecionada ? (
            <Check className="w-4 h-4" strokeWidth={3} />
          ) : null}
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

      {selecionada && clausula.camposExtras && clausula.camposExtras.length > 0 && (
        <div
          className="mt-4 pt-4 border-t border-[var(--selo-green)]/25 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {clausula.camposExtras.map((campo) => (
            <CampoExtra
              key={campo.key}
              clausulaId={clausula.id}
              campo={campo}
              value={extras[campo.key] ?? ""}
              onExtraChange={onExtraChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CampoExtra — input de campo extra de cláusula com máscara + validação.
 */
function CampoExtra({
  clausulaId,
  campo,
  value,
  onExtraChange,
}: {
  clausulaId: string;
  campo: CampoModelo;
  value: string;
  onExtraChange: (fieldKey: string, value: string) => void;
}) {
  const { tipo, erro, handleChange, handleBlur } = useCampoValidado(campo, value, (v) =>
    onExtraChange(campo.key, v)
  );
  const inputId = `extra-${clausulaId}-${campo.key}`;
  const isTextarea = campo.tipo === "textarea";
  const isSelect = campo.tipo === "select" && campo.opcoes && campo.opcoes.length > 0;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink/75">
        {campo.pergunta}
      </label>
      {isTextarea ? (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={campo.placeholder}
          rows={2}
          aria-invalid={!!erro}
          className={cn(
            "w-full min-h-[3rem] px-3 py-2 text-base rounded-lg bg-surface border-2 outline-none transition-all resize-none placeholder:text-ink/40",
            erro
              ? "border-[var(--coral)] focus:border-[var(--coral)]"
              : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]"
          )}
        />
      ) : isSelect ? (
        <div className="relative">
          <select
            id={inputId}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            aria-invalid={!!erro}
            className={cn(
              "w-full h-11 pl-3 pr-9 text-base rounded-lg bg-surface border-2 outline-none transition-all appearance-none cursor-pointer",
              erro
                ? "border-[var(--coral)] focus:border-[var(--coral)]"
                : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]",
              !value && "text-ink/40"
            )}
          >
            <option value="" disabled>
              {campo.placeholder ?? "Selecione…"}
            </option>
            {campo.opcoes!.map((op) => (
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
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={campo.placeholder}
          inputMode={campo.tipo === "number" || tipo === "numero" ? "decimal" : "text"}
          aria-invalid={!!erro}
          className={cn(
            "w-full h-11 px-3 text-base rounded-lg bg-surface border-2 outline-none transition-all placeholder:text-ink/40",
            erro
              ? "border-[var(--coral)] focus:border-[var(--coral)]"
              : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]"
          )}
        />
      )}
      {erro && (
        <p className="text-xs text-[var(--coral)] font-medium flex items-center gap-1.5">
          <span aria-hidden="true">⚠</span>
          {erro}
        </p>
      )}
      {!erro && campo.microcopy && (
        <p className="text-xs text-ink/55 italic flex items-start gap-1">
          <span aria-hidden="true" className="text-[var(--selo-green)] mt-px">•</span>
          <span>{campo.microcopy}</span>
        </p>
      )}
    </div>
  );
}
