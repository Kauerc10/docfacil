"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNav } from "./nav-context";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function AIBanner() {
  const root = useRef<HTMLElement>(null);
  const { navigate } = useNav();

  useGSAP(
    () => {
      if (!root.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
      });
      tl.from("[data-ia='eyebrow']", { y: 18, opacity: 0, duration: 0.5 })
        .from("[data-ia='title']", { y: 24, opacity: 0, duration: 0.6 }, "-=0.3")
        .from("[data-ia='desc']", { y: 18, opacity: 0, duration: 0.5 }, "-=0.4")
        .from("[data-ia='cta']", { y: 14, opacity: 0, duration: 0.5 }, "-=0.35")
        .from(
          "[data-ia='orb']",
          { scale: 0.6, opacity: 0, duration: 0.9, ease: "back.out(1.5)" },
          "-=0.7"
        );

      // slow orbit of the small dots
      gsap.to("[data-ia='orb-spin']", {
        rotation: 360,
        duration: 26,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} data-ia="root" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[var(--navy)] text-white px-6 py-12 sm:px-12 sm:py-16">
          {/* subtle stamped paper texture overlay */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
            <div>
              <p
                data-ia="eyebrow"
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-semibold uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerador com IA
              </p>
              <h2
                data-ia="title"
                className="mt-4 font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold tracking-tight text-balance"
              >
                Não achou o modelo que precisa? A IA monta o documento certo pra
                você.
              </h2>
              <p
                data-ia="desc"
                className="mt-4 text-white/70 text-lg max-w-xl leading-relaxed"
              >
                Descreva sua situação em uma frase. A gente propõe a estrutura,
                você aprova, e o assistente preenche o resto.
              </p>
              <a
                data-ia="cta"
                href="#ia"
                onClick={(e) => { e.preventDefault(); navigate("ia"); }}
                className="mt-7 inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[#1e44a8] active:scale-[0.98] transition-all shadow-[0_10px_28px_-10px_rgba(37,84,199,0.8)]"
              >
                Experimentar Gerador com IA
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Orbital stamp graphic */}
            <div data-ia="orb" className="relative hidden lg:grid place-items-center min-h-[280px]">
              <div className="relative w-64 h-64">
                <div
                  data-ia="orb-spin"
                  className="absolute inset-0"
                >
                  {[0, 72, 144, 216, 288].map((deg, i) => (
                    <span
                      key={deg}
                      className="absolute left-1/2 top-1/2 w-2.5 h-2.5 rounded-full bg-[var(--blue-royal)]"
                      style={{
                        transform: `rotate(${deg}deg) translateY(-128px)`,
                        opacity: 0.5 + (i % 2) * 0.3,
                      }}
                    />
                  ))}
                  <span className="absolute inset-8 rounded-full border border-dashed border-white/15" />
                  <span className="absolute inset-16 rounded-full border border-dashed border-white/10" />
                </div>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="grid place-items-center w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
