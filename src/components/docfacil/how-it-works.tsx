"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Selo } from "./selo";
import { Pet } from "./pet";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS = [
  {
    n: "01",
    title: "Escolha o modelo",
    desc: "Contrato, declaração, procuração. Você acha o que precisa em segundos.",
  },
  {
    n: "02",
    title: "Converse com o assistente",
    desc: "Uma pergunta de cada vez, sem juridiquês. Como um atendente guiando.",
  },
  {
    n: "03",
    title: "Baixe seu PDF",
    desc: "Pronto e formatado. O documento é seu para assinar e usar.",
  },
];

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-how='title']", {
        scrollTrigger: { trigger: "[data-how='title']", start: "top 85%", once: true },
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });

      // steps stagger
      gsap.from("[data-how='step']", {
        scrollTrigger: { trigger: "[data-how='steps']", start: "top 80%", once: true },
        y: 40,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.15,
      });

      // The split-screen demo reveals
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "[data-how='demo']",
          start: "top 72%",
          once: true,
        },
      });
      tl.from("[data-how='demo-left']", {
        x: -40,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      })
        .from(
          "[data-how='bubble']",
          { x: -20, opacity: 0, duration: 0.5, stagger: 0.25 },
          "-=0.3"
        )
        .from(
          "[data-how='demo-right']",
          { x: 40, opacity: 0, duration: 0.7 },
          "-=0.8"
        )
        .from(
          "[data-how='fill']",
          {
            backgroundColor: "rgba(37,84,199,0.28)",
            duration: 0.6,
            stagger: 0.2,
            ease: "power2.out",
          },
          "-=0.2"
        );
    },
    { scope: root }
  );

  return (
    <section ref={root} className="relative py-16 sm:py-24 bg-[var(--blue-soft)]/30 border-y border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div data-how="title" className="text-center max-w-2xl mx-auto">
          <p className="text-[var(--selo-green)] font-semibold text-sm uppercase tracking-wider">
            Como funciona
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Três passos. Sem trava, sem mistério.
          </h2>
        </div>

        {/* Steps */}
        <div data-how="steps" className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              data-how="step"
              className="relative bg-surface border border-[var(--border)] rounded-2xl p-7"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-[family-name:var(--font-jakarta)] text-5xl font-extrabold text-[var(--blue-royal)]/15">
                  {s.n}
                </span>
                <h3 className="font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink">
                  {s.title}
                </h3>
              </div>
              <p className="mt-3 text-ink/65 leading-relaxed">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-[var(--blue-royal)]/25" />
              )}
            </div>
          ))}
        </div>

        {/* Split-screen demo — shows the actual product experience */}
        <div
          data-how="demo"
          className="mt-14 rounded-3xl overflow-hidden border border-[var(--border)] shadow-[0_30px_60px_-30px_rgba(14,35,64,0.35)] bg-surface"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[420px]">
            {/* Left — Assistente chat */}
            <div
              data-how="demo-left"
              className="p-6 sm:p-8 bg-[var(--paper)] flex flex-col gap-4"
            >
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
                <Pet mood="idle" size={28} />
                <span className="font-semibold text-ink text-sm">Assistente DocFacil</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--selo-green)] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[var(--selo-green)] animate-pulse" />
                  no passo 2 de 5
                </span>
              </div>

              <div data-how="bubble" className="flex gap-3">
                <div className="shrink-0 w-8 h-8">
                  <Pet mood="falando" size={32} />
                </div>
                <div className="bg-surface border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-ink/80 text-[0.95rem] leading-relaxed">
                    Qual o <strong>nome completo</strong> de quem está alugando o
                    imóvel?
                  </p>
                </div>
              </div>

              <div data-how="bubble" className="ml-auto bg-[var(--blue-royal)] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%]">
                <p className="text-[0.95rem]">Maria Aparecida da Silva</p>
              </div>

              <div data-how="bubble" className="flex gap-3">
                <div className="shrink-0 w-8 h-8">
                  <Pet mood="idle" size={32} />
                </div>
                <div className="bg-surface border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-ink/80 text-[0.95rem] leading-relaxed">
                    Perfeito. E o <strong>endereço do imóvel</strong>?
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-3">
                <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-surface border border-[var(--blue-soft)] focus-within:border-[var(--blue-royal)] transition-colors">
                  <input
                    disabled
                    placeholder="Rua das Flores, 123 — São Paulo/SP"
                    className="flex-1 bg-transparent outline-none text-ink text-[0.975rem] placeholder:text-ink/40"
                  />
                  <kbd className="hidden sm:inline-flex text-xs text-ink/40 px-2 py-1 rounded border border-[var(--border)]">
                    Enter ↵
                  </kbd>
                </div>
                <p className="mt-2 pen-note text-sm pl-1">
                  pode copiar direto do RG, sem abreviar 👆
                </p>
              </div>
            </div>

            {/* Right — Ateliê live preview */}
            <div
              data-how="demo-right"
              className="relative p-6 sm:p-8 bg-[#efe9dd] grid place-items-center"
            >
              {/* A4 sheet */}
              <div className="relative w-full max-w-[300px] aspect-[1/1.414] bg-white shadow-[0_20px_40px_-20px_rgba(14,35,64,0.3)] rounded-sm p-5 overflow-hidden">
                <Selo variant="watermark" />

                <div className="relative">
                  <p className="font-[family-name:var(--font-jakarta)] text-[0.7rem] font-bold text-ink uppercase tracking-wide text-center">
                    Contrato de Locação
                  </p>
                  <div className="mt-3 h-px bg-ink/15" />

                  <p className="mt-3 text-[0.62rem] leading-relaxed text-ink/75 text-pretty">
                    Pelo presente instrumento particular,{" "}
                    <span
                      data-how="fill"
                      className="font-semibold text-ink rounded px-0.5"
                    >
                      Maria Aparecida da Silva
                    </span>
                    , doravante denominada LOCADORA, loca para{" "}
                    <span className="border-b border-dotted border-ink/40 px-2 text-ink/40">
                      &nbsp; &nbsp; &nbsp; &nbsp;
                    </span>{" "}
                    o imóvel situado na{" "}
                    <span
                      data-how="fill"
                      className="font-semibold text-ink rounded px-0.5"
                    >
                      Rua das Flores, 123 — São Paulo/SP
                    </span>
                    .
                  </p>

                  <p className="mt-3 text-[0.62rem] leading-relaxed text-ink/75">
                    O prazo da locação é de{" "}
                    <span className="border-b border-dotted border-ink/40 px-3 text-ink/40">
                      &nbsp;
                    </span>{" "}
                    meses, com valor mensal de R${" "}
                    <span
                      data-how="fill"
                      className="font-semibold text-ink rounded px-0.5"
                    >
                      1.450,00
                    </span>
                    .
                  </p>

                  <div className="mt-6 flex justify-between items-end">
                    <div className="text-center">
                      <div className="w-16 border-b border-ink/40" />
                      <p className="mt-1 text-[0.5rem] text-ink/50">LOCADORA</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 border-b border-ink/40" />
                      <p className="mt-1 text-[0.5rem] text-ink/50">LOCATÁRIO</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--green-tint)] border border-[var(--selo-green)]/30 text-[var(--selo-green)] text-[0.7rem] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--selo-green)]" />
                atualizando ao vivo
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
