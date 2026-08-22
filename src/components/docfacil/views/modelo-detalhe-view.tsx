"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, ArrowRight, Check, Clock, FileText } from "lucide-react";
import { getModel } from "@/lib/services/models-service";
import type { Modelo } from "@/lib/types";
import { useNav } from "@/components/docfacil/nav-context";
import { PdfDocumentPreview } from "@/components/docfacil/pdf-document-preview";
import { PageShell } from "@/components/docfacil/views/page-shell";
import { A4Skeleton, DetalheInfoSkeleton, ErrorState } from "@/components/docfacil/views/skeletons";

gsap.registerPlugin(useGSAP);

function normalizeStepLabel(label: string): string {
  return label
    .replace(/\s*\([^)]*opcion[^)]*\)/gi, "")
    .replace(/\s*—.*$/g, "")
    .replace(/:\s*$/, "")
    .trim();
}

function getPreparationSteps(modelo: Modelo): string[] {
  const etapas = modelo.etapas ?? [];
  const labels = etapas.map((etapa) => {
    if (etapa.tipo === "campo_grupo") {
      return normalizeStepLabel(etapa.tituloGrupo ?? "Dados principais");
    }
    if (etapa.tipo === "clausulas") {
      return normalizeStepLabel(etapa.titulo ?? "Condições do documento");
    }
    if (etapa.campo.tipo === "lista_pessoas") {
      return "Pessoas relacionadas ao documento";
    }
    return normalizeStepLabel(etapa.campo.pergunta);
  });

  const unique = labels.filter(
    (label, index) => label && labels.indexOf(label) === index
  );

  if (unique.length === 0) {
    return ["Dados das partes", "Informações principais do documento"];
  }
  if (unique.length <= 5) return unique;
  return [...unique.slice(0, 4), "Condições e detalhes finais"];
}

/** Página curta de contexto antes da criação, sem antecipar um formulário gigante. */
export function ModeloDetalheView() {
  const root = useRef<HTMLDivElement>(null);
  const { params, navigate } = useNav();
  const slug = params.slug ?? "";

  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setModelo(await getModel(slug));
    } catch (e) {
      console.error("[ModeloDetalheView] falha ao carregar modelo:", e);
      setError("Não foi possível carregar este modelo agora.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!modelo) return;
      gsap.from("[data-det='col']", {
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.12,
      });
      gsap.from("[data-det='item']", {
        y: 12,
        opacity: 0,
        duration: 0.36,
        ease: "power2.out",
        stagger: 0.06,
        delay: 0.18,
      });
    },
    { scope: root, dependencies: [modelo] }
  );

  const preparationSteps = useMemo(
    () => (modelo ? getPreparationSteps(modelo) : []),
    [modelo]
  );

  if (loading) {
    return (
      <PageShell>
        <div
          ref={root}
          className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
          role="status"
          aria-busy="true"
          aria-label="Carregando modelo"
        >
          <button
            type="button"
            onClick={() => navigate("modelos")}
            className="inline-flex items-center gap-1.5 text-ink/65 hover:text-[var(--blue-royal)] font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao catálogo
          </button>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14">
            <DetalheInfoSkeleton />
            <div className="lg:sticky lg:top-24 self-start">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink/45">
                Prévia do documento
              </div>
              <div className="mt-3 mx-auto max-w-sm">
                <A4Skeleton />
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
          <ErrorState message={error} onRetry={load} />
        </div>
      </PageShell>
    );
  }

  if (!modelo) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
          <FileText className="mx-auto w-12 h-12 text-ink/30" />
          <h1 className="mt-4 font-[family-name:var(--font-jakarta)] text-2xl font-bold text-ink">
            Modelo não encontrado
          </h1>
          <p className="mt-2 text-ink/65">
            O documento que você procura não está mais disponível ou o link está incorreto.
          </p>
          <button
            type="button"
            onClick={() => navigate("modelos")}
            className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao catálogo
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div ref={root} className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button
          type="button"
          onClick={() => navigate("modelos")}
          className="inline-flex items-center gap-1.5 text-ink/65 hover:text-[var(--blue-royal)] font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao catálogo
        </button>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14">
          <div data-det="col">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)]">
              {modelo.categoria}
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-ink tracking-tight text-balance">
              {modelo.nome}
            </h1>

            <section className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--selo-green)]">
                Use este documento quando…
              </h2>
              <p className="mt-2 text-ink/75 text-lg leading-relaxed text-pretty">
                {modelo.quandoUsar}
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink/55">
                Você vai informar
              </h2>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {preparationSteps.map((step) => (
                  <li
                    key={step}
                    data-det="item"
                    className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-surface px-3.5 py-3 text-sm font-medium text-ink/80"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--green-tint)] text-[var(--selo-green)]">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="mt-6 flex items-center gap-2 text-ink/65">
              <Clock className="w-5 h-5 text-[var(--selo-green)]" />
              <span>
                Cerca de <strong className="text-ink font-semibold">{modelo.minutos} minutos</strong> para preencher.
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate("criar", { slug: modelo.slug })}
              className="mt-8 inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-[var(--blue-royal)] text-white text-lg font-semibold hover:bg-[var(--navy)] transition-colors shadow-md w-full sm:w-auto"
            >
              Começar agora
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div data-det="col" className="lg:sticky lg:top-24 self-start">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/45">
              <FileText className="w-3.5 h-3.5" />
              Prévia do documento
            </div>
            <div className="mt-3 mx-auto max-w-sm rounded-2xl bg-surface p-3 sm:p-4 shadow-[0_20px_50px_-30px_rgba(14,35,64,0.35)] ring-1 ring-black/5">
              <PdfDocumentPreview modelo={modelo} />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
