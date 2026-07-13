"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Download, Share2, Mail, MessageCircle } from "lucide-react";
import { Selo } from "./selo";
import { useNav } from "./nav-context";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * SuccessShowcase — the climax of the DocFacil experience.
 * When scrolled into view, the green stamp "strikes" the document:
 * scales beyond 1 then settles, with a small shake (the only expressive
 * motion allowed in the whole interface — because it's the payoff).
 */
export function SuccessShowcase() {
  const root = useRef<HTMLElement>(null);
  const { navigate } = useNav();

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-ss='eyebrow']", {
        scrollTrigger: { trigger: "[data-ss='eyebrow']", start: "top 85%", once: true },
        y: 18,
        opacity: 0,
        duration: 0.5,
      });
      gsap.from("[data-ss='title']", {
        scrollTrigger: { trigger: "[data-ss='title']", start: "top 85%", once: true },
        y: 24,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });

      // The stamp strike — the brand climax
      const tl = gsap.timeline({
        scrollTrigger: { trigger: "[data-ss='stage']", start: "top 70%", once: true },
      });
      tl.set("[data-ss='stamp']", { scale: 0, opacity: 0, rotation: -18 })
        .to("[data-ss='stamp']", {
          scale: 1.18,
          opacity: 1,
          rotation: -8,
          duration: 0.34,
          ease: "power3.in",
        })
        .to("[data-ss='stamp']", {
          scale: 1,
          duration: 0.28,
          ease: "back.out(2.2)",
        })
        .to(
          "[data-ss='sheet']",
          {
            x: 4,
            y: -2,
            duration: 0.05,
            yoyo: true,
            repeat: 5,
          },
          "-=0.3"
        )
        .from(
          "[data-ss='cta']",
          { y: 16, opacity: 0, duration: 0.5 },
          "-=0.1"
        )
        .from(
          "[data-ss='secondary']",
          { y: 10, opacity: 0, duration: 0.4, stagger: 0.08 },
          "-=0.3"
        )
        .from(
          "[data-ss='upsell']",
          { y: 10, opacity: 0, duration: 0.4 },
          "-=0.2"
        );
    },
    { scope: root }
  );

  return (
    <section ref={root} className="relative py-16 sm:py-24 bg-[var(--green-tint)]/40 border-y border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p data-ss="eyebrow" className="text-[var(--selo-green)] font-semibold text-sm uppercase tracking-wider">
            O final
          </p>
          <h2 data-ss="title" className="mt-2 font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Pronto. Seu documento ganha o selo.
          </h2>
        </div>

        {/* Stage */}
        <div data-ss="stage" className="relative mt-12 mx-auto max-w-3xl">
          <div className="relative bg-surface rounded-3xl border border-[var(--border)] shadow-[0_30px_60px_-30px_rgba(14,35,64,0.3)] p-6 sm:p-10 overflow-hidden">
            {/* A4 sheet with stamp overlay */}
            <div data-ss="sheet" className="relative mx-auto w-full max-w-[320px] aspect-[1/1.414] bg-white rounded-sm shadow-[0_18px_36px_-18px_rgba(14,35,64,0.35)] p-6 overflow-hidden">
              <Selo variant="watermark" />

              <div className="relative">
                <p className="font-[family-name:var(--font-jakarta)] text-xs font-bold text-ink uppercase tracking-wide text-center">
                  Contrato de Locação
                </p>
                <div className="mt-3 h-px bg-ink/15" />
                <p className="mt-3 text-[0.62rem] leading-relaxed text-ink/70">
                  Pelo presente instrumento particular,{" "}
                  <span className="font-semibold text-ink">Maria Aparecida da Silva</span>{" "}
                  loca para o(a) locatário(a) o imóvel situado na{" "}
                  <span className="font-semibold text-ink">Rua das Flores, 123 — São Paulo/SP</span>,
                  pelo prazo de 30 meses.
                </p>
                <div className="mt-6 flex justify-between items-end">
                  <div className="text-center">
                    <div className="w-20 border-b border-ink/40" />
                    <p className="mt-1 text-[0.5rem] text-ink/50">LOCADORA</p>
                  </div>
                  <div className="text-center">
                    <div className="w-20 border-b border-ink/40" />
                    <p className="mt-1 text-[0.5rem] text-ink/50">LOCATÁRIO</p>
                  </div>
                </div>
              </div>

              {/* The striking stamp */}
              <div
                data-ss="stamp"
                className="absolute inset-0 grid place-items-center pointer-events-none"
                aria-hidden="true"
              >
                <div className="relative grid place-items-center w-40 h-40">
                  <div className="absolute inset-0 rounded-full border-[3px] border-[var(--selo-green)]/70" />
                  <div className="absolute inset-2 rounded-full border-2 border-dashed border-[var(--selo-green)]/50" />
                  <div className="text-center text-[var(--selo-green)]">
                    <p className="font-[family-name:var(--font-jakarta)] font-extrabold text-xl leading-none tracking-tight">
                      DOCFACIL
                    </p>
                    <p className="mt-1 text-[0.55rem] font-semibold uppercase tracking-widest opacity-80">
                      Válido · {new Date().toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA — single coral button, the only one on the screen */}
            <div className="mt-8 text-center">
              <button
                data-ss="cta"
                type="button"
                className="coral-pulse inline-flex items-center justify-center gap-2.5 h-14 w-full sm:w-auto sm:px-10 rounded-2xl bg-[var(--coral)] text-white font-bold text-lg hover:bg-[var(--coral-hover)] active:scale-[0.99] transition-colors"
              >
                <Download className="w-5 h-5" />
                Baixar Documento (PDF)
              </button>

              <div className="mt-5 flex items-center justify-center gap-3">
                {[
                  { Icon: MessageCircle, label: "WhatsApp" },
                  { Icon: Mail, label: "E-mail" },
                  { Icon: Share2, label: "Copiar link" },
                ].map(({ Icon, label }) => (
                  <button
                    key={label}
                    data-ss="secondary"
                    type="button"
                    aria-label={label}
                    className="grid place-items-center w-11 h-11 rounded-full border border-[var(--border)] text-ink/70 hover:bg-[var(--blue-soft)] hover:text-[var(--blue-royal)] transition-colors"
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </button>
                ))}
              </div>

              <p data-ss="upsell" className="mt-7 text-sm text-ink/60">
                Quer editar isso depois?{" "}
                <a href="#login" onClick={(e) => { e.preventDefault(); navigate("login"); }} className="text-[var(--blue-royal)] font-semibold hover:underline">
                  Crie uma conta grátis
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
