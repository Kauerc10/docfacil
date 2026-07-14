"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Quote } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const TESTIMONIALS = [
  {
    name: "Cleonice M.",
    role: "Dona de casa, 64 anos",
    text: "Achei que ia ser igual aqueles sites confusos. Mas foi só responder as perguntinhas. Meu contrato de aluguel saiu pronto.",
  },
  {
    name: "Rodrigo P.",
    role: "Pequeno empreendedor",
    text: "Precisei de um comodato pra emprestar um equipamento. Em 4 minutos estava pronto e formatado. A corujinha me guiou direitinho.",
  },
  {
    name: "Ana Lúcia F.",
    role: "Aposentada, 71 anos",
    text: "Não entendo nada de computador. Mas o atendente no zap me ajudou quando travei. Isso pra mim valeu tudo.",
  },
];

export function SocialProof() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-sp='head']", {
        scrollTrigger: { trigger: "[data-sp='head']", start: "top 85%", once: true },
        y: 26,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
      gsap.from("[data-sp='pill']", {
        scrollTrigger: { trigger: "[data-sp='pills']", start: "top 85%", once: true },
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
      });
      gsap.from("[data-sp='card']", {
        scrollTrigger: { trigger: "[data-sp='cards']", start: "top 82%", once: true },
        y: 36,
        opacity: 0,
        duration: 0.55,
        stagger: 0.12,
        ease: "power3.out",
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-sp="head" className="text-center max-w-2xl mx-auto">
          <p className="text-[var(--selo-green)] font-semibold text-sm uppercase tracking-wider">
            Quem usa, confia
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Feito pra quem tem pressa e pouca intimidade com telas
          </h2>
        </div>

        {/* Trust pills */}
        <div data-sp="pills" className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {[
            "Modelos revisados com prática cartorial real",
            "Sempre tem gente no WhatsApp",
            "Linguagem simples, sem juridiquês",
          ].map((t) => (
            <span
              key={t}
              data-sp="pill"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-[var(--border)] text-ink/80 font-medium text-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--selo-green)]" />
              {t}
            </span>
          ))}
        </div>

        {/* Testimonials */}
        <div data-sp="cards" className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              data-sp="card"
              className="relative doc-card p-6 sm:p-7"
            >
              <Quote className="w-7 h-7 text-[var(--blue-royal)]/30" />
              <p className="mt-3 text-ink/85 leading-relaxed text-[1.02rem] text-pretty">
                “{t.text}”
              </p>
              <div className="mt-5 pt-4 border-t border-[var(--border)]/70 flex items-center gap-3">
                <div className="grid place-items-center w-10 h-10 rounded-full bg-[var(--green-tint)] text-[var(--selo-green)] font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-ink text-sm">{t.name}</p>
                  <p className="text-xs text-ink/55">{t.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
