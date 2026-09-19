"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

type Mood = "idle" | "falando" | "feliz" | "atencao" | "pensando";

export type PetProps = {
  mood?: Mood;
  size?: number;
  className?: string;
  lookAtCursor?: boolean;
  showDashedCircle?: boolean;
};

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function Pet({
  mood = "idle",
  size = 80,
  className,
  lookAtCursor = false,
  showDashedCircle = true,
}: PetProps) {
  const corujinha = useRef<SVGSVGElement>(null);
  const pupilLeftRef = useRef<SVGCircleElement>(null);
  const pupilRightRef = useRef<SVGCircleElement>(null);
  const highlightLeftRef = useRef<SVGCircleElement>(null);
  const highlightRightRef = useRef<SVGCircleElement>(null);
  const eyelidLeftRef = useRef<SVGRectElement>(null);
  const eyelidRightRef = useRef<SVGRectElement>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  useGSAP(
    () => {
      const el = corujinha.current;
      if (!el || reducedMotion) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.killTweensOf(el);
      gsap.set(el, { y: 0, rotation: 0, scale: 1 });
      applyMood(el, mood);
    },
    { scope: corujinha, dependencies: [mood, reducedMotion] }
  );

  // Acompanhamento suave do cursor no desktop (apenas se lookAtCursor=true e !reducedMotion)
  useEffect(() => {
    if (!lookAtCursor || reducedMotion || typeof window === "undefined") return;

    // Apenas ativa tracking em dispositivos com mouse/pointer fino
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number;
    let blinkTimeout: ReturnType<typeof setTimeout>;
    let isBlinking = false;

    const handlePointerMove = (e: PointerEvent) => {
      const el = corujinha.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width * 0.5;
      const eyeCenterY = rect.top + rect.height * 0.42;

      const dx = e.clientX - eyeCenterX;
      const dy = e.clientY - eyeCenterY;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        targetX = 0;
        targetY = 0;
        return;
      }

      const angle = Math.atan2(dy, dx);
      // Alcance máximo do movimento: 2.5px no viewBox 0..100
      const maxDist = 2.5;
      const factor = Math.min(dist / 400, 1);
      targetX = Math.cos(angle) * maxDist * factor;
      targetY = Math.sin(angle) * maxDist * factor;
    };

    const handlePointerLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const updateLoop = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      if (pupilLeftRef.current) {
        pupilLeftRef.current.setAttribute("cx", (40 + currentX).toFixed(2));
        pupilLeftRef.current.setAttribute("cy", (42 + currentY).toFixed(2));
      }
      if (pupilRightRef.current) {
        pupilRightRef.current.setAttribute("cx", (60 + currentX).toFixed(2));
        pupilRightRef.current.setAttribute("cy", (42 + currentY).toFixed(2));
      }
      if (highlightLeftRef.current) {
        highlightLeftRef.current.setAttribute("cx", (41 + currentX).toFixed(2));
        highlightLeftRef.current.setAttribute("cy", (41 + currentY).toFixed(2));
      }
      if (highlightRightRef.current) {
        highlightRightRef.current.setAttribute("cx", (61 + currentX).toFixed(2));
        highlightRightRef.current.setAttribute("cy", (41 + currentY).toFixed(2));
      }

      rafId = requestAnimationFrame(updateLoop);
    };

    rafId = requestAnimationFrame(updateLoop);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave, { passive: true });

    // Ciclo de piscada natural (a cada 4 a 7 segundos)
    const scheduleBlink = () => {
      const delay = 4000 + Math.random() * 3000;
      blinkTimeout = setTimeout(() => {
        isBlinking = true;
        if (eyelidLeftRef.current && eyelidRightRef.current) {
          eyelidLeftRef.current.setAttribute("height", "10");
          eyelidRightRef.current.setAttribute("height", "10");
        }
        setTimeout(() => {
          if (eyelidLeftRef.current && eyelidRightRef.current) {
            eyelidLeftRef.current.setAttribute("height", "0");
            eyelidRightRef.current.setAttribute("height", "0");
          }
          isBlinking = false;
          scheduleBlink();
        }, 140);
      }, delay);
    };
    scheduleBlink();

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(blinkTimeout);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [lookAtCursor, reducedMotion]);

  return (
    <div
      className={cn("relative inline-block select-none", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {mood === "pensando" && <ThinkingBubbles />}
      {mood === "falando" && <TalkingDots />}

      {/* Círculo tracejado — opcional */}
      {showDashedCircle && (
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
          style={{ pointerEvents: "none" }}
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="var(--blue-royal)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
            opacity="0.35"
          >
            {!reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 50 50"
                to="360 50 50"
                dur="40s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        </svg>
      )}

      {/* Corujinha */}
      <svg
        ref={corujinha}
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
        style={{ transformOrigin: "50% 70%" }}
      >
        {/* Orelhas */}
        <path d="M 33 34 Q 30 25 35 24 Q 38 29 37 34 Z" fill="var(--blue-royal)" />
        <path d="M 67 34 Q 70 25 65 24 Q 62 29 63 34 Z" fill="var(--blue-royal)" />

        {/* Corpo */}
        <path
          d="M 30 38 Q 30 28 50 28 Q 70 28 70 38 L 74 70 Q 74 80 50 80 Q 26 80 26 70 Z"
          fill="var(--blue-royal)"
        />
        <path
          d="M 38 50 Q 38 44 50 44 Q 62 44 62 50 L 64 72 Q 64 78 50 78 Q 36 78 36 72 Z"
          fill="var(--blue-soft)"
        />

        {/* Olhos brancos */}
        <circle cx="40" cy="42" r="8" fill="white" />
        <circle cx="60" cy="42" r="8" fill="white" />

        {/* Pupilas */}
        <circle
          ref={pupilLeftRef}
          cx="40"
          cy="42"
          r="4"
          fill="var(--ink)"
        >
          {!reducedMotion && !lookAtCursor && (
            <>
              <animate attributeName="cx" values="40;42;38;40" dur="4s" repeatCount="indefinite" />
              <animate attributeName="cy" values="42;40;44;42" dur="4s" repeatCount="indefinite" />
            </>
          )}
        </circle>
        <circle
          ref={pupilRightRef}
          cx="60"
          cy="42"
          r="4"
          fill="var(--ink)"
        >
          {!reducedMotion && !lookAtCursor && (
            <>
              <animate attributeName="cx" values="60;62;58;60" dur="4s" repeatCount="indefinite" />
              <animate attributeName="cy" values="42;40;44;42" dur="4s" repeatCount="indefinite" />
            </>
          )}
        </circle>

        {/* Brilho dos olhos */}
        <circle
          ref={highlightLeftRef}
          cx="41"
          cy="41"
          r="1.5"
          fill="white"
        >
          {!reducedMotion && !lookAtCursor && (
            <>
              <animate attributeName="cx" values="41;43;39;41" dur="4s" repeatCount="indefinite" />
              <animate attributeName="cy" values="41;39;43;41" dur="4s" repeatCount="indefinite" />
            </>
          )}
        </circle>
        <circle
          ref={highlightRightRef}
          cx="61"
          cy="41"
          r="1.5"
          fill="white"
        >
          {!reducedMotion && !lookAtCursor && (
            <>
              <animate attributeName="cx" values="61;63;59;61" dur="4s" repeatCount="indefinite" />
              <animate attributeName="cy" values="41;39;43;41" dur="4s" repeatCount="indefinite" />
            </>
          )}
        </circle>

        {/* Pálpebras */}
        {mood !== "atencao" && (
          <>
            <rect
              ref={eyelidLeftRef}
              x="32"
              y="34"
              width="16"
              height="0"
              fill="var(--blue-royal)"
              rx="1"
            >
              {!reducedMotion && !lookAtCursor && (
                <animate
                  attributeName="height"
                  values="0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;10;0"
                  dur="5s"
                  repeatCount="indefinite"
                />
              )}
            </rect>
            <rect
              ref={eyelidRightRef}
              x="52"
              y="34"
              width="16"
              height="0"
              fill="var(--blue-royal)"
              rx="1"
            >
              {!reducedMotion && !lookAtCursor && (
                <animate
                  attributeName="height"
                  values="0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;10;0"
                  dur="5s"
                  repeatCount="indefinite"
                />
              )}
            </rect>
          </>
        )}

        {/* Bico */}
        <path d="M 47 50 L 53 50 L 50 55 Z" fill="var(--selo-green)" />
        {mood === "falando" && (
          <path d="M 47.5 52 L 52.5 52 L 50 55 Z" fill="var(--ink)" opacity="0.3">
            {!reducedMotion && (
              <animate attributeName="opacity" values="0.3;0.6;0.3;0.6;0.3" dur="0.4s" repeatCount="indefinite" />
            )}
          </path>
        )}

        {/* Sobrancelhas */}
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

        {/* Asas */}
        <path d="M 28 52 Q 22 56 24 62 Q 27 60 30 58 Z" fill="var(--blue-royal)" opacity="0.85">
          {mood === "feliz" && !reducedMotion && (
            <animateTransform attributeName="transform" type="rotate" values="0 28 56; -20 28 56; 0 28 56" dur="0.3s" repeatCount="3" />
          )}
        </path>
        <path d="M 72 52 Q 78 56 76 62 Q 73 60 70 58 Z" fill="var(--blue-royal)" opacity="0.85">
          {mood === "feliz" && !reducedMotion && (
            <animateTransform attributeName="transform" type="rotate" values="0 72 56; 20 72 56; 0 72 56" dur="0.3s" repeatCount="3" />
          )}
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

function ThinkingBubbles() {
  return (
    <div className="absolute -top-3 right-0 flex flex-col items-end gap-1" aria-hidden="true">
      <span className="block w-1.5 h-1.5 rounded-full bg-[var(--blue-royal)]/40" style={{ animation: "petBubble 2s ease-in-out infinite" }} />
      <span className="block w-2 h-2 rounded-full bg-[var(--blue-royal)]/60" style={{ animation: "petBubble 2s ease-in-out 0.3s infinite" }} />
      <span className="block w-2.5 h-2.5 rounded-full bg-[var(--blue-royal)]/80" style={{ animation: "petBubble 2s ease-in-out 0.6s infinite" }} />
      <style>{`@keyframes petBubble { 0%,100% { opacity:0.3; transform:translateY(2px) scale(0.8); } 50% { opacity:1; transform:translateY(-2px) scale(1); } }`}</style>
    </div>
  );
}

function TalkingDots() {
  return (
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1 items-center" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="block w-1 h-1 rounded-full bg-[var(--selo-green)]" style={{ animation: `petTyping 1.2s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
      <style>{`@keyframes petTyping { 0%,60%,100% { opacity:0.3; transform:translateY(0); } 30% { opacity:1; transform:translateY(-3px); } }`}</style>
    </div>
  );
}

function applyMood(el: SVGSVGElement, mood: Mood): void {
  switch (mood) {
    case "feliz":
      gsap.timeline()
        .to(el, { y: -14, scale: 1.06, duration: 0.28, ease: "back.out(1.7)" })
        .to(el, { rotation: -5, duration: 0.12, ease: "power1.inOut" })
        .to(el, { rotation: 5, duration: 0.12, ease: "power1.inOut" })
        .to(el, { rotation: 0, duration: 0.12, ease: "power1.inOut" })
        .to(el, { y: 0, scale: 1, duration: 0.35, ease: "bounce.out" })
        .to(el, { y: -3, scale: 1.015, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: -1 });
      break;
    case "atencao":
      gsap.timeline()
        .to(el, { rotation: -2, duration: 0.08, ease: "power1.inOut" })
        .to(el, { rotation: 2, duration: 0.08, ease: "power1.inOut" })
        .to(el, { rotation: -1.5, duration: 0.08, ease: "power1.inOut" })
        .to(el, { rotation: 1.5, duration: 0.08, ease: "power1.inOut" })
        .to(el, { rotation: 0, duration: 0.15, ease: "power2.out" });
      gsap.to(el, { y: -2, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      break;
    case "falando":
      gsap.to(el, { y: -2, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(el, { scale: 1.02, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 60%" });
      break;
    case "pensando":
      gsap.to(el, { y: -3, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      break;
    case "idle":
    default:
      gsap.to(el, { scale: 1.03, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 60%" });
      break;
  }
}
