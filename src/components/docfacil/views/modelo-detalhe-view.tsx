"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, ArrowRight, Check, Clock, FileText } from "lucide-react";
import { getModelo } from "@/lib/modelos";
import { useNav } from "@/components/docfacil/nav-context";
import { PageShell } from "@/components/docfacil/views/page-shell";
import { Selo } from "@/components/docfacil/selo";

gsap.registerPlugin(useGSAP);

/**
 * ModeloDetalheView (spec 4.3) — página intermediária antes de /criar.
 *
 * O público leigo precisa entender o que está prestes a fazer antes de
 * responder perguntas. Esta tela explica "quando usar", lista o que vai
 * precisar ter em mãos e mostra uma prévia do documento.
 */
export function ModeloDetalheView() {
  const root = useRef<HTMLDivElement>(null);
  const { params, navigate } = useNav();
  const slug = params.slug ?? "";
  const modelo = getModelo(slug);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from("[data-det='col']", {
        y: 28,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.12,
      });
      gsap.from("[data-det='item']", {
        y: 14,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.07,
        delay: 0.2,
      });
    },
    { scope: root }
  );

  if (!modelo) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
          <FileText className="mx-auto w-12 h-12 text-ink/30" />
          <h1 className="mt-4 font-[family-name:var(--font-jakarta)] text-2xl font-bold text-ink">
            Modelo não encontrado
          </h1>
          <p className="mt-2 text-ink/65">
            O documento que você procura não está mais disponível ou o link está
            incorreto.
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

  // Primeira linha do corpo como amostra da prévia.
  const primeiraLinha = modelo.template.corpo[0] ?? "";

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

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14">
          {/* === COLUNA ESQUERDA — info === */}
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
                O que você vai precisar
              </h2>
              <ul className="mt-3 bg-surface border border-[var(--border)] rounded-2xl p-3 sm:p-4 divide-y divide-[var(--border)]/70">
                {modelo.campos.map((c, i) => (
                  <li
                    key={c.key}
                    data-det="item"
                    className="flex items-start gap-3 px-1 py-3"
                  >
                    <span className="mt-0.5 grid place-items-center w-6 h-6 shrink-0 rounded-full bg-[var(--green-tint)] text-[var(--selo-green)]">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-ink font-medium leading-snug">
                        <span className="text-ink/40 mr-1.5">{i + 1}.</span>
                        {c.pergunta}
                      </p>
                      {c.microcopy && (
                        <p className="mt-0.5 text-sm text-ink/55 italic">
                          {c.microcopy}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <div className="mt-6 flex items-center gap-2 text-ink/65">
              <Clock className="w-5 h-5 text-[var(--selo-green)]" />
              <span className="text-lg">
                Leva cerca de{" "}
                <strong className="text-ink font-semibold">
                  {modelo.minutos} minutos
                </strong>{" "}
                para preencher.
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

          {/* === COLUNA DIREITA — prévia A4 === */}
          <div data-det="col" className="lg:sticky lg:top-24 self-start">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/45">
              <FileText className="w-3.5 h-3.5" />
              Prévia do documento
            </div>

            <div className="mt-3 mx-auto max-w-sm">
              <div className="relative w-full aspect-[1/1.414] bg-white rounded-md shadow-[0_10px_40px_-12px_rgba(14,35,64,0.25)] border border-[var(--border)] overflow-hidden">
                {/* Marca d'água do selo */}
                <Selo variant="watermark" />

                {/* Margem + conteúdo */}
                <div className="relative h-full p-[8%] flex flex-col">
                  {/* Cabeçalho */}
                  <div className="text-center">
                    <p className="text-[0.55rem] uppercase tracking-[0.2em] text-ink/45 font-semibold">
                      Documento particular
                    </p>
                    <h3 className="mt-2 font-[family-name:var(--font-jakarta)] text-[1.05rem] sm:text-base font-extrabold text-ink tracking-tight leading-tight">
                      {modelo.template.titulo}
                    </h3>
                    <div className="mt-2 h-px w-16 mx-auto bg-ink/15" />
                  </div>

                  {/* Corpo amostral com placeholders pontilhados */}
                  <div className="mt-5 flex-1 text-[0.62rem] sm:text-[0.66rem] leading-[1.7] text-ink/75 space-y-2.5">
                    <p>{renderPlaceholders(primeiraLinha)}</p>
                    <p className="text-ink/40">
                      {renderPlaceholders(
                        "Pelo presente instrumento, {{partes}} firmam o presente acordo nos termos abaixo."
                      )}
                    </p>
                    <p className="text-ink/30">
                      _______________________________________________
                      <br />
                      <span className="text-ink/40">Local e data</span>
                    </p>
                  </div>

                  {/* Assinaturas */}
                  <div className="mt-auto pt-3 grid grid-cols-2 gap-3 text-[0.5rem] text-ink/55">
                    <div className="text-center">
                      <div className="border-t border-ink/30 pt-1">
                        {modelo.campos[0]?.key ?? "Parte 1"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="border-t border-ink/30 pt-1">
                        {modelo.campos[1]?.key ?? "Parte 2"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-ink/45 italic">
                Prévia ilustrativa — o documento final é gerado com as suas
                respostas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * Substitui {{placeholder}} por underline pontilhado, simulando o que o
 * usuário verá antes de preencher. Visualmente reforça "isso é um rascunho,
 * falta a sua parte".
 */
function renderPlaceholders(texto: string) {
  const parts = texto.split(/(\{\{[^}]+\}\})/g);
  return parts.map((p, i) => {
    const m = p.match(/^\{\{([^}]+)\}\}$/);
    if (m) {
      return (
        <span
          key={i}
          className="inline-block min-w-12 mx-0.5 align-baseline border-b border-dashed border-[var(--blue-royal)]/55 text-[var(--blue-royal)]/80 font-medium"
        >
          {m[1]}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
