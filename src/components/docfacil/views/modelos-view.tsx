"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Clock, Search, Sparkles, X } from "lucide-react";
import { CATEGORIAS, MODELOS, type Categoria } from "@/lib/modelos";
import { useNav } from "@/components/docfacil/nav-context";
import { PageHeader, PageShell } from "@/components/docfacil/views/page-shell";
import { DocIcons } from "@/components/docfacil/catalog";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Filtro = "Todos" | Categoria;

/**
 * ModelosView (spec 4.2) — catálogo completo com busca + filtro por categoria.
 * Reaproveita o .doc-card do design system e os DocIcons do Catalog.
 */
export function ModelosView() {
  const root = useRef<HTMLDivElement>(null);
  const { navigate } = useNav();
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("Todos");

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODELOS.filter((m) => {
      const okCat = filtro === "Todos" || m.categoria === filtro;
      if (!okCat) return false;
      if (!q) return true;
      return (
        m.nome.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q) ||
        m.quandoUsar.toLowerCase().includes(q)
      );
    });
  }, [query, filtro]);

  // Refresh ScrollTrigger whenever the list changes so the stagger re-runs.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const st = ScrollTrigger.refresh();
      gsap.from("[data-modelos='card']", {
        scrollTrigger: {
          trigger: "[data-modelos='grid']",
          start: "top 88%",
          once: true,
        },
        y: 36,
        opacity: 0,
        duration: 0.55,
        ease: "power3.out",
        stagger: 0.08,
      });
      return () => st;
    },
    { scope: root, dependencies: [filtrados.length] }
  );

  return (
    <PageShell>
      <div ref={root} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <PageHeader
          eyebrow="Catálogo completo"
          title="Encontre o documento certo para a sua situação"
          subtitle="Busque por nome, situação ou categoria. Cada modelo é uma conversa curta — não um formulário gigante."
        />

        {/* Search bar */}
        <div className="mt-8 max-w-2xl">
          <label htmlFor="modelos-busca" className="sr-only">
            Buscar modelo de documento
          </label>
          <div className="relative">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/45"
              aria-hidden="true"
            />
            <input
              id="modelos-busca"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar: aluguel, união estável, procuração…"
              className="w-full h-14 pl-14 pr-12 rounded-2xl bg-surface border border-[var(--border)] text-lg text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-[var(--blue-royal)]/35 focus:border-[var(--blue-royal)] transition-shadow shadow-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute right-4 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-ink/50 hover:text-ink hover:bg-[var(--paper)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div
          className="mt-6 flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por categoria"
        >
          <ChipButton
            active={filtro === "Todos"}
            onClick={() => setFiltro("Todos")}
          >
            Todos
          </ChipButton>
          {CATEGORIAS.map((cat) => (
            <ChipButton
              key={cat}
              active={filtro === cat}
              onClick={() => setFiltro(cat)}
            >
              {cat}
            </ChipButton>
          ))}
        </div>

        {/* Result count */}
        <p
          className="mt-6 text-sm text-ink/55"
          aria-live="polite"
          data-modelos="count"
        >
          {filtrados.length}{" "}
          {filtrados.length === 1 ? "modelo encontrado" : "modelos encontrados"}
          {filtro !== "Todos" && ` em ${filtro}`}
          {query && ` para “${query}”`}
        </p>

        {/* Grid or empty state */}
        {filtrados.length > 0 ? (
          <div
            data-modelos="grid"
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          >
            {filtrados.map((d) => (
              <article
                key={d.slug}
                data-modelos="card"
                className="doc-card group p-6 flex flex-col cursor-pointer focus-within:ring-2 focus-within:ring-[var(--blue-royal)]/40"
                onClick={() => navigate("modelo-detalhe", { slug: d.slug })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("modelo-detalhe", { slug: d.slug });
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Abrir detalhes do modelo ${d.nome}`}
              >
                <div className="flex items-start justify-between">
                  <div className="grid place-items-center w-14 h-14 rounded-xl bg-[var(--blue-soft)] text-[var(--blue-royal)] group-hover:bg-[var(--blue-royal)] group-hover:text-white transition-colors duration-300">
                    {DocIcons[d.icone]}
                  </div>
                  <span className="text-xs font-semibold text-ink/55 px-2.5 py-1 rounded-full bg-[var(--paper)] border border-[var(--border)]">
                    {d.categoria}
                  </span>
                </div>
                <h3 className="mt-5 font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink">
                  {d.nome}
                </h3>
                <p className="mt-1.5 text-ink/65 leading-relaxed">{d.desc}</p>
                <div className="mt-5 pt-4 border-t border-[var(--border)]/70 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink/55">
                    <Clock className="w-4 h-4" />
                    {d.minutos} min
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[var(--blue-royal)] font-semibold text-sm opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-300">
                    Preencher agora
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState onIA={() => navigate("ia")} />
        )}
      </div>
    </PageShell>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "h-10 px-4 rounded-full text-sm font-semibold bg-[var(--blue-royal)] text-white shadow-sm transition-colors"
          : "h-10 px-4 rounded-full text-sm font-semibold bg-[var(--blue-soft)]/70 text-ink/75 hover:bg-[var(--blue-soft)] hover:text-[var(--blue-royal)] transition-colors"
      }
    >
      {children}
    </button>
  );
}

/** Estado vazio — ilustração SVG própria (lupa + pasta), CTA p/ IA. */
function EmptyState({ onIA }: { onIA: () => void }) {
  return (
    <div
      data-modelos="empty"
      className="mt-10 mx-auto max-w-xl text-center bg-surface border border-[var(--border)] rounded-2xl px-6 py-12 sm:py-16"
    >
      <svg
        viewBox="0 0 160 120"
        fill="none"
        className="mx-auto w-40 h-30 text-[var(--blue-royal)]"
        aria-hidden="true"
      >
        {/* Pasta suspensa com abas */}
        <path
          d="M14 38 H58 L66 30 H122 a4 4 0 0 1 4 4 V96 a4 4 0 0 1 -4 4 H18 a4 4 0 0 1 -4 -4 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="var(--blue-soft)"
          opacity="0.55"
        />
        <path
          d="M14 50 H122"
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.4"
        />
        {/* Folha saindo da pasta */}
        <rect
          x="40"
          y="20"
          width="60"
          height="46"
          rx="3"
          fill="var(--surface)"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M48 32 H92 M48 40 H92 M48 48 H78"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Lupa sobre a folha */}
        <circle
          cx="108"
          cy="78"
          r="16"
          fill="var(--green-tint)"
          stroke="var(--selo-green)"
          strokeWidth="2.2"
        />
        <path
          d="M120 90 L138 108"
          stroke="var(--selo-green)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M102 78 H114 M108 72 V84"
          stroke="var(--selo-green)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>

      <h3 className="mt-6 font-[family-name:var(--font-jakarta)] text-2xl font-bold text-ink">
        Não achamos esse modelo.
      </h3>
      <p className="mt-2 text-ink/65 text-lg">
        Que tal tentar com nossa IA? Descreva o que você precisa e a gente
        monta.
      </p>
      <button
        type="button"
        onClick={onIA}
        className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] transition-colors shadow-sm"
      >
        <Sparkles className="w-4 h-4" />
        Gerar com IA
      </button>
    </div>
  );
}
