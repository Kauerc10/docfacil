"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { Pet } from "../../pet";
import { Selo } from "../../selo";
import { useTypingText } from "../../use-typing-text";
import { UX_CONFIG } from "@/lib/constants";
import { CampoPergunta } from "./campo-input";
import { GrupoCampos } from "./grupo-campos";
import { ClausulasPergunta } from "./clausula-card";
import type { ChatStepProps } from "./types";

gsap.registerPlugin(useGSAP);

/**
 * ChatStep — bloco de conversa Concierge: Pet + pergunta (digitada) + input.
 *
 * Layout mobile-first:
 *  - Pet 44px mobile, 56px desktop (canto superior esquerdo)
 *  - Bubble com rounded-tl-sm (canto superior esquerdo quadrado = "vem do pet")
 *  - Conteúdo (input/clausulas/grupo) fica indentado à direita do pet:
 *      pl-[52px] mobile, pl-[68px] desktop
 *  - Animações: chatIn (entrada do bubble) + contentIn (entrada do conteúdo)
 *  - Progress indicator "faltam X etapas" no rodapé
 */
export function ChatStep({
  petText,
  petMood = "falando",
  etapa,
  stepIndex,
  totalEtapas,
  respostas,
  onInputChange,
  onGrupoFieldChange,
  onClausulaFieldChange,
  onAvancar,
  isLast,
  submitting = false,
}: ChatStepProps) {
  const root = useRef<HTMLDivElement>(null);

  // Digitação progressiva do pet
  const { text: petTextoDigitado, done: petDone } = useTypingText(
    petText,
    UX_CONFIG.TYPING_SPEED,
    [petText, stepIndex]
  );

  // Anim: chat bubble + content entram suaves
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline();
      tl.fromTo(
        "[data-chat='bubble']",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
      tl.fromTo(
        "[data-chat='content']",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" },
        "-=0.15"
      );
    },
    { scope: root, dependencies: [stepIndex] }
  );

  const faltam = Math.max(0, totalEtapas - (stepIndex + 1));

  return (
    <div ref={root} className="space-y-3" style={{ animation: "chatIn 0.4s cubic-bezier(0.22,1,0.36,1)" }}>
      <style>{`
        @keyframes chatIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes contentIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Bubble do pet */}
      <div className="flex gap-3 sm:gap-4">
        <div className="shrink-0">
          <Pet mood={petMood} size={44} className="sm:hidden" />
          <Pet mood={petMood} size={56} className="hidden sm:block" />
        </div>
        <div
          data-chat="bubble"
          className={cn(
            "bg-surface border border-[var(--border)] rounded-2xl rounded-tl-sm",
            "px-4 sm:px-5 py-3 sm:py-3.5 max-w-[88%] sm:max-w-[80%]"
          )}
        >
          <p className="text-ink text-base sm:text-lg leading-relaxed font-medium">
            {petTextoDigitado}
            {!petDone && <span className="inline-block w-1 h-4 ml-0.5 bg-[var(--blue-royal)] animate-pulse align-middle" />}
          </p>
        </div>
      </div>

      {/* Conteúdo da etapa (indentado à direita do pet) */}
      <div
        data-chat="content"
        className="pl-[52px] sm:pl-[68px]"
        style={{ animation: "contentIn 0.45s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
      >
        {etapa.tipo === "pergunta" && (
          <CampoPergunta
            campo={etapa.campo}
            value={respostas.campos[etapa.campo.key] ?? ""}
            onChange={(v) => onInputChange(etapa.campo.key, v)}
            onAvancar={onAvancar}
            isLast={isLast}
            submitting={submitting}
          />
        )}

        {etapa.tipo === "grupo" && (
          <GrupoCampos
            titulo={etapa.titulo}
            campos={etapa.campos}
            values={respostas.campos}
            onFieldChange={(fieldKey, value) =>
              onGrupoFieldChange("grupo", fieldKey, value)
            }
            onAvancar={onAvancar}
            isLast={isLast}
            submitting={submitting}
          />
        )}

        {etapa.tipo === "clausulas" && (
          <ClausulasPergunta
            clausulas={etapa.clausulas}
            selecionadas={respostas.clausulasSelecionadas}
            extras={{}}
            onToggle={(id, sel) =>
              onClausulaFieldChange(id, { tipo: "toggle", selecionada: sel })
            }
            onExtraChange={(id, fieldKey, value) =>
              onClausulaFieldChange(id, { tipo: "extra", fieldKey, value })
            }
            onAvancar={onAvancar}
            isLast={isLast}
            submitting={submitting}
          />
        )}
      </div>

      {/* Progresso */}
      <div className="pl-[52px] sm:pl-[68px] flex items-center gap-2 text-xs text-ink/55">
        <Selo variant="mark" className="w-3.5 h-3.5 opacity-60" />
        <span>
          {faltam === 0
            ? "última etapa"
            : `faltam ${faltam} etapa${faltam > 1 ? "s" : ""}`}
        </span>
      </div>
    </div>
  );
}
