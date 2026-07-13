"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Clock } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Doc = {
  name: string;
  desc: string;
  category: string;
  minutes: number;
  icon: React.ReactNode;
};

/** Line icons drawn from scratch — carimbo, lacre, assinatura, pasta suspensa.
 *  Not a generic icon-pack set. */
const Icons = {
  key: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <path
        d="M15 22a7 7 0 1 1 4-12.7M19 17l13 13M28 24l3-3M24 28l3-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="15" r="6.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <path
        d="M6 18 L20 7 L34 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 16 V32 H30 V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M17 32 V24 H23 V32"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
  handshake: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <path
        d="M5 18 L12 12 L20 16 L28 12 L35 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12 V26 M28 12 V26"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M15 22 L20 26 L25 22"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  family: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="27" cy="13" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M6 32 V28 a8 8 0 0 1 16 0 V32"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M22 30 V28 a6 6 0 0 1 11 0 V30"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <path
        d="M10 6 H30 V34 L26 32 L22 34 L18 32 L14 34 L10 32 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M15 14 H25 M15 19 H25 M15 24 H21"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
  seal: (
    <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
      <circle
        cx="20"
        cy="17"
        r="9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeDasharray="2.5 2.5"
      />
      <path
        d="M14 17 L18 21 L26 13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 25 L17 33 L20 30 L23 33 L26 25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const DOCS: Doc[] = [
  {
    name: "Contrato de Locação",
    desc: "Para alugar imóvel com segurança entre as partes.",
    category: "Locação",
    minutes: 4,
    icon: Icons.key,
  },
  {
    name: "Declaração de Residência",
    desc: "Comprove onde mora para bancos, escolas e órgãos.",
    category: "Pessoal",
    minutes: 2,
    icon: Icons.home,
  },
  {
    name: "Contrato de Comodato",
    desc: "Empréstimo gratuito de bens entre conhecidos.",
    category: "Comercial",
    minutes: 3,
    icon: Icons.handshake,
  },
  {
    name: "Compra e Venda",
    desc: "Venda de bens com cláusulas claras e seguras.",
    category: "Comercial",
    minutes: 5,
    icon: Icons.receipt,
  },
  {
    name: "União Estável",
    desc: "Documente a relação para direitos e deveres.",
    category: "Família",
    minutes: 4,
    icon: Icons.family,
  },
  {
    name: "Procuração Simples",
    desc: "Autorize alguém a representar você em atos.",
    category: "Pessoal",
    minutes: 2,
    icon: Icons.seal,
  },
];

export function Catalog() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-cat='head']", {
        scrollTrigger: { trigger: "[data-cat='head']", start: "top 85%", once: true },
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
      gsap.from("[data-cat='card']", {
        scrollTrigger: { trigger: "[data-cat='grid']", start: "top 82%", once: true },
        y: 36,
        opacity: 0,
        duration: 0.55,
        ease: "power3.out",
        stagger: 0.1,
      });
      gsap.from("[data-cat='more']", {
        scrollTrigger: { trigger: "[data-cat='more']", start: "top 92%", once: true },
        opacity: 0,
        duration: 0.5,
      });
    },
    { scope: root }
  );

  return (
    <section
      ref={root}
      id="modelos"
      className="relative py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Head */}
        <div data-cat="head" className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-[var(--selo-green)] font-semibold text-sm uppercase tracking-wider">
              Catálogo em destaque
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
              Documentos prontos para a sua situação
            </h2>
            <p className="mt-2 text-ink/60 text-lg max-w-xl">
              Escolha um modelo e responda perguntas simples. O resto é com a
              gente.
            </p>
          </div>
          <a
            href="#modelos"
            className="inline-flex items-center gap-1.5 text-[var(--blue-royal)] font-semibold hover:gap-2.5 transition-all whitespace-nowrap"
          >
            Ver todos os modelos
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Grid */}
        <div
          data-cat="grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
        >
          {DOCS.map((d) => (
            <article
              key={d.name}
              data-cat="card"
              className="doc-card group p-6 flex flex-col"
            >
              <div className="flex items-start justify-between">
                <div className="grid place-items-center w-14 h-14 rounded-xl bg-[var(--blue-soft)] text-[var(--blue-royal)] group-hover:bg-[var(--blue-royal)] group-hover:text-white transition-colors duration-300">
                  {d.icon}
                </div>
                <span className="text-xs font-semibold text-ink/50 px-2.5 py-1 rounded-full bg-[var(--paper)] border border-[var(--border)]">
                  {d.category}
                </span>
              </div>

              <h3 className="mt-5 font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink">
                {d.name}
              </h3>
              <p className="mt-1.5 text-ink/65 leading-relaxed">{d.desc}</p>

              <div className="mt-5 pt-4 border-t border-[var(--border)]/70 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm text-ink/55">
                  <Clock className="w-4 h-4" />
                  {d.minutes} min
                </span>
                <a
                  href="#criar"
                  className="inline-flex items-center gap-1.5 text-[var(--blue-royal)] font-semibold text-sm opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                >
                  Preencher agora
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </article>
          ))}
        </div>

        <div data-cat="more" className="mt-10 text-center">
          <a
            href="#modelos"
            className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-[var(--blue-royal)]/30 text-[var(--blue-royal)] font-semibold hover:bg-[var(--blue-soft)] transition-colors"
          >
            Ver catálogo completo
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    </section>
  );
}
