"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * Pet — mascote corujinha do DocFacil.
 * Coruja com orelhas (tufts), símbolo de sabedoria + documentos.
 * Animações GSAP fluidas (um único useGSAP coordena tudo, sem tremor).
 */
type Mood = "idle" | "falando" | "feliz" | "atencao" | "pensando";

export function Pet({ mood = "idle", size = 80, className }: { mood?: Mood; size?: number; className?: string; }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.killTweensOf(el);
    gsap.to(el, { y: 0, rotation: 0, scale: 1, duration: 0.2, ease: "power2.out", onComplete: () => applyMood(el, mood) });
  }, { scope: root, dependencies: [mood] });

  return (
    <div ref={root} className={cn("relative inline-block", className)} style={{ width: size, height: size }}>
      {mood === "pensando" && <ThinkingBubbles />}
      {mood === "falando" && <TalkingDots />}
      {/* Círculo tracejado — SVG separado, rotaciona independentemente do pet */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true" style={{ pointerEvents: "none" }}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--blue-royal)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.4">
          <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="40s" repeatCount="indefinite" />
        </circle>
      </svg>
      {/* Corujinha — SVG separado, não rotaciona com o círculo */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {/* Orelhas (tufts sutis e arredondados) */}
        <path d="M 33 34 Q 30 25 35 24 Q 38 29 37 34 Z" fill="var(--blue-royal)" />
        <path d="M 67 34 Q 70 25 65 24 Q 62 29 63 34 Z" fill="var(--blue-royal)" />
        {/* Corpo */}
        <path d="M 30 38 Q 30 28 50 28 Q 70 28 70 38 L 74 70 Q 74 80 50 80 Q 26 80 26 70 Z" fill="var(--blue-royal)" />
        <path d="M 38 50 Q 38 44 50 44 Q 62 44 62 50 L 64 72 Q 64 78 50 78 Q 36 78 36 72 Z" fill="var(--blue-soft)" />
        {/* Olhos */}
        <circle cx="40" cy="42" r="8" fill="white" />
        <circle cx="60" cy="42" r="8" fill="white" />
        <circle cx="40" cy="42" r="4" fill="var(--ink)">
          <animate attributeName="cx" values="40;42;38;40" dur="4s" repeatCount="indefinite" />
          <animate attributeName="cy" values="42;40;44;42" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="42" r="4" fill="var(--ink)">
          <animate attributeName="cx" values="60;62;58;60" dur="4s" repeatCount="indefinite" />
          <animate attributeName="cy" values="42;40;44;42" dur="4s" repeatCount="indefinite" />
        </circle>
        {/* Brilho dos olhos — reflexo de luz natural (offset +1,-1 da pupila, mesmo timing 4s) */}
        <circle cx="41" cy="41" r="1.5" fill="white">
          <animate attributeName="cx" values="41;43;39;41" dur="4s" repeatCount="indefinite" />
          <animate attributeName="cy" values="41;39;43;41" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="61" cy="41" r="1.5" fill="white">
          <animate attributeName="cx" values="61;63;59;61" dur="4s" repeatCount="indefinite" />
          <animate attributeName="cy" values="41;39;43;41" dur="4s" repeatCount="indefinite" />
        </circle>
        {/* Pálpebras (pisca a cada 5s) */}
        {mood !== "atencao" && (
          <rect x="32" y="34" width="16" height="0" fill="var(--blue-royal)" rx="1">
            <animate attributeName="height" values="0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;10;0" dur="5s" repeatCount="indefinite" />
          </rect>
        )}
        {mood !== "atencao" && (
          <rect x="52" y="34" width="16" height="0" fill="var(--blue-royal)" rx="1">
            <animate attributeName="height" values="0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;10;0" dur="5s" repeatCount="indefinite" />
          </rect>
        )}
        {/* Bico */}
        <path d="M 47 50 L 53 50 L 50 55 Z" fill="var(--selo-green)" />
        {mood === "falando" && (
          <path d="M 47.5 52 L 52.5 52 L 50 55 Z" fill="var(--ink)" opacity="0.3">
            <animate attributeName="opacity" values="0.3;0.6;0.3;0.6;0.3" dur="0.4s" repeatCount="indefinite" />
          </path>
        )}
        {/* Sobrancelhas conforme mood */}
        {mood === "atencao" ? (
          <>
            <path d="M 34 34 L 46 36" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
            <path d="M 54 36 L 66 34" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : mood === "feliz" ? (
          <>
            <path d="M 35 35 Q 40 32 45 34" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 55 34 Q 60 32 65 35" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        ) : null}
        {/* Asas — batem quando feliz */}
        <path d="M 28 52 Q 22 56 24 62 Q 27 60 30 58 Z" fill="var(--blue-royal)" opacity="0.85">
          {mood === "feliz" && <animateTransform attributeName="transform" type="rotate" values="0 28 56; -20 28 56; 0 28 56" dur="0.3s" repeatCount="3" />}
        </path>
        <path d="M 72 52 Q 78 56 76 62 Q 73 60 70 58 Z" fill="var(--blue-royal)" opacity="0.85">
          {mood === "feliz" && <animateTransform attributeName="transform" type="rotate" values="0 72 56; 20 72 56; 0 72 56" dur="0.3s" repeatCount="3" />}
        </path>
        {/* Selo no peito */}
        <circle cx="50" cy="64" r="4" fill="none" stroke="var(--selo-green)" strokeWidth="1" strokeDasharray="1 1" />
        <path d="M 48 64 L 50 66 L 52 62" stroke="var(--selo-green)" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Pés */}
        <ellipse cx="42" cy="80" rx="3" ry="1.5" fill="var(--ink)" />
        <ellipse cx="58" cy="80" rx="3" ry="1.5" fill="var(--ink)" />
      </svg>
    </div>
  );
}

function applyMood(el: HTMLDivElement, mood: Mood): void {
  switch (mood) {
    case "feliz":
      gsap.timeline()
        .to(el, { y: -18, scale: 1.08, duration: 0.3, ease: "back.out(1.7)" })
        .to(el, { rotation: -8, duration: 0.15, ease: "power1.inOut" })
        .to(el, { rotation: 8, duration: 0.15, ease: "power1.inOut" })
        .to(el, { rotation: 0, duration: 0.15, ease: "power1.inOut" })
        .to(el, { y: 0, scale: 1, duration: 0.4, ease: "bounce.out" })
        .to(el, { y: -5, scale: 1.02, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
      break;
    case "atencao":
      gsap.timeline()
        .to(el, { rotation: -3, duration: 0.08, ease: "power1.inOut" })
        .to(el, { rotation: 3, duration: 0.08, ease: "power1.inOut" })
        .to(el, { rotation: -2, duration: 0.08, ease: "power1.inOut" })
        .to(el, { rotation: 2, duration: 0.08, ease: "power1.inOut" })
        .to(el, { rotation: 0, duration: 0.15, ease: "power2.out" })
        .to(el, { rotation: 6, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 85%" });
      break;
    case "falando":
      gsap.to(el, { rotation: 2, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 85%" });
      gsap.to(el, { scale: 1.02, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 60%" });
      break;
    case "pensando":
      gsap.to(el, { y: -4, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      break;
    case "idle":
    default:
      gsap.to(el, { scale: 1.03, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 60%" });
      break;
  }
}

function ThinkingBubbles() {
  return (
    <div className="absolute -top-3 right-0 flex flex-col items-end gap-1" aria-hidden>
      <span className="block w-1.5 h-1.5 rounded-full bg-[var(--blue-royal)]/40" style={{ animation: "petBubble 2s ease-in-out infinite" }} />
      <span className="block w-2 h-2 rounded-full bg-[var(--blue-royal)]/60" style={{ animation: "petBubble 2s ease-in-out 0.3s infinite" }} />
      <span className="block w-2.5 h-2.5 rounded-full bg-[var(--blue-royal)]/80" style={{ animation: "petBubble 2s ease-in-out 0.6s infinite" }} />
      <style>{`@keyframes petBubble { 0%,100% { opacity:0.3; transform:translateY(2px) scale(0.8); } 50% { opacity:1; transform:translateY(-2px) scale(1); } }`}</style>
    </div>
  );
}

function TalkingDots() {
  return (
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1 items-center" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="block w-1 h-1 rounded-full bg-[var(--selo-green)]" style={{ animation: `petTyping 1.2s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
      <style>{`@keyframes petTyping { 0%,60%,100% { opacity:0.3; transform:translateY(0); } 30% { opacity:1; transform:translateY(-3px); } }`}</style>
    </div>
  );
}
