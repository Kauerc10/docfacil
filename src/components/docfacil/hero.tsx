"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Search, ArrowRight, ShieldCheck } from "lucide-react";
import { Selo } from "./selo";
import { Pet } from "./pet";
import { useNav } from "./nav-context";
import { MODELOS } from "@/lib/modelos";

gsap.registerPlugin(useGSAP);

const POPULAR_TAGS = MODELOS.filter((m) => m.popular).map((m) => m.nome);

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const { navigate } = useNav();

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-hero='badge']", {
        y: 16,
        opacity: 0,
        duration: 0.5,
      })
        .from(
          "[data-hero='title'] > span",
          { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.08 },
          "-=0.2"
        )
        .from(
          "[data-hero='subtitle']",
          { y: 18, opacity: 0, duration: 0.6 },
          "-=0.35"
        )
        .from(
          "[data-hero='search']",
          { y: 18, opacity: 0, duration: 0.55 },
          "-=0.4"
        )
        .from(
          "[data-hero='tag']",
          { y: 12, opacity: 0, duration: 0.4, stagger: 0.06 },
          "-=0.35"
        )
        .from(
          "[data-hero='selo']",
          { scale: 0.6, opacity: 0, duration: 0.7, ease: "back.out(1.6)" },
          "-=0.6"
        )
        .from(
          "[data-hero='stat']",
          { y: 14, opacity: 0, duration: 0.45, stagger: 0.1 },
          "-=0.4"
        );

      // NOTA: o círculo tracejado do Pet já gira via SMIL animation no
      // próprio SVG (40s, 360°). A corujinha NÃO gira — apenas bounce/scale
      // conforme o mood. Antes havia aqui um `gsap.to("[data-hero='selo']
      // svg", { rotation: 360 })` que girava AMBOS os SVGs do Pet — era
      // isso que fazia o "pet girar". Removido.
    },
    { scope: root }
  );

  return (
    <section
      ref={root}
      id="topo"
      className="relative pt-28 sm:pt-32 lg:pt-36 pb-14 sm:pb-20 overflow-hidden"
    >
      {/* Decorative paper deck — subtle A4 sheets behind, not blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
      >
        <div className="absolute -top-10 -right-10 w-[420px] h-[560px] rounded-md bg-white border border-[var(--border)] rotate-[8deg] shadow-sm" />
        <div className="absolute top-6 -right-24 w-[420px] h-[560px] rounded-md bg-white border border-[var(--border)] rotate-[14deg] shadow-sm" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div
          data-hero="badge"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--green-tint)] border border-[var(--selo-green)]/25 text-[var(--selo-green)] text-[0.85rem] font-semibold mb-7"
        >
          <ShieldCheck className="w-4 h-4" />
          Modelos baseados em prática cartorial real
        </div>

        {/* Title with split lines for stagger */}
        <h1
          data-hero="title"
          className="font-[family-name:var(--font-jakarta)] text-ink font-extrabold tracking-tight text-balance text-[2.1rem] leading-[1.08] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.06]"
        >
          <span className="block overflow-hidden">
            <span className="block">Seus documentos legais</span>
          </span>
          <span className="block overflow-hidden">
            <span className="block">
              prontos como numa{" "}
              <span className="relative inline-block text-[var(--blue-royal)]">
                conversa.
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8 C 80 2, 220 2, 298 8"
                    stroke="var(--selo-green)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </span>
          </span>
        </h1>

        {/* Subtitle */}
        <p
          data-hero="subtitle"
          className="mt-7 mx-auto max-w-2xl text-ink/70 text-lg sm:text-xl leading-relaxed text-pretty"
        >
          Sem burocracia, sem juridiquês. Responda perguntas simples e veja seu
          documento ganhar forma — como se um atendente montasse pra você.
        </p>

        {/* Search */}
        <form
          data-hero="search"
          onSubmit={(e) => e.preventDefault()}
          className="mt-9 mx-auto max-w-2xl"
          role="search"
        >
          <div className="group relative flex items-center gap-2 h-14 sm:h-16 pl-5 pr-2 rounded-2xl bg-surface border border-[var(--border)] shadow-[0_10px_30px_-14px_rgba(14,35,64,0.25)] focus-within:border-[var(--blue-royal)] focus-within:shadow-[0_14px_36px_-12px_rgba(37,84,199,0.45)] transition-all">
            <Search className="w-5 h-5 text-ink/40 shrink-0" />
            <input
              type="search"
              placeholder="Qual documento você precisa hoje?"
              aria-label="Buscar documento"
              className="flex-1 h-full bg-transparent outline-none text-ink text-lg sm:text-xl placeholder:text-ink/40"
            />
            <button
              type="submit"
              className="hidden sm:inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[#1e44a8] active:scale-[0.98] transition-all"
            >
              Buscar
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Popular tags */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <span className="text-sm text-ink/50 font-medium mr-1">
            Mais buscados:
          </span>
          {MODELOS.filter((m) => m.popular).map((m) => (
            <button
              key={m.slug}
              data-hero="tag"
              type="button"
              onClick={() => navigate("modelo-detalhe", { slug: m.slug })}
              className="px-3.5 py-1.5 rounded-full bg-[var(--blue-soft)]/70 text-[var(--blue-royal)] text-sm font-semibold border border-[var(--blue-royal)]/15 hover:bg-[var(--blue-soft)] hover:border-[var(--blue-royal)]/30 transition-colors"
            >
              {m.nome}
            </button>
          ))}
        </div>

        {/* Credibility seal + stats row */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          <div data-hero="selo" className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
            <Pet mood="idle" size={112} />
          </div>

          <div className="flex items-center gap-6 sm:gap-8">
            <Stat data-hero="stat" value="+48 mil" label="documentos gerados" />
            <span className="w-px h-10 bg-[var(--border)]" aria-hidden />
            <Stat data-hero="stat" value="3 min" label="tempo médio" />
            <span className="w-px h-10 bg-[var(--border)]" aria-hidden />
            <Stat data-hero="stat" value="100%" label="em português claro" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  ...rest
}: { value: string; label: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="text-center sm:text-left" {...rest}>
      <div className="font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold text-ink leading-none">
        {value}
      </div>
      <div className="mt-1 text-sm text-ink/55">{label}</div>
    </div>
  );
}
