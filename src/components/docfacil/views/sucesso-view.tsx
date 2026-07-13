"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, Check, Copy, Download, Mail, MessageCircle } from "lucide-react";
import { Selo } from "../selo";
import { useNav } from "../nav-context";
import { getModelo } from "@/lib/modelos";
import { PageShell, PageHeader } from "./page-shell";

gsap.registerPlugin(useGSAP);

/**
 * SucessoView — the standalone success / download screen, shown right after
 * the user finishes a document in CriarView. This is the brand climax:
 * the green DOCFACIL stamp "strikes" the A4 sheet (scale overshoot + small
 * yoyo shake), then the single coral CTA breathes in.
 *
 * Distinct from SuccessShowcase (the home-page marketing version): this one
 * fires on mount (not on scroll) and uses the real model the user just filled.
 */
export function SucessoView() {
  const { params, navigate } = useNav();
  const slug = params.slug ?? "";
  const modelo = getModelo(slug);

  const root = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);

  // Stamp strike — fires on mount (no ScrollTrigger needed, user just landed).
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        // No animation — just place the stamp in its final state.
        gsap.set("[data-suc='stamp']", { scale: 1, opacity: 1, rotation: -8 });
        return;
      }

      const tl = gsap.timeline();
      tl.set("[data-suc='stamp']", { scale: 0, opacity: 0, rotation: -18 })
        .to("[data-suc='stamp']", {
          scale: 1.18,
          opacity: 1,
          rotation: -8,
          duration: 0.34,
          ease: "power3.in",
        })
        .to("[data-suc='stamp']", {
          scale: 1,
          duration: 0.28,
          ease: "back.out(2.2)",
        })
        .to(
          "[data-suc='sheet']",
          {
            x: 4,
            y: -2,
            duration: 0.05,
            yoyo: true,
            repeat: 5,
          },
          "-=0.3"
        )
        .from("[data-suc='cta']", { y: 16, opacity: 0, duration: 0.5 }, "-=0.1")
        .from(
          "[data-suc='secondary']",
          { y: 10, opacity: 0, duration: 0.4, stagger: 0.08 },
          "-=0.3"
        )
        .from("[data-suc='upsell']", { y: 10, opacity: 0, duration: 0.4 }, "-=0.2");
    },
    { scope: root }
  );

  if (!modelo) {
    return (
      <PageShell>
        <div className="grid place-items-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <Selo variant="mark" className="w-10 h-10 mx-auto" />
            <h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-2xl font-bold text-ink">
              Documento não encontrado
            </h2>
            <p className="mt-2 text-ink/65">
              Não conseguimos localizar esse documento. Que tal explorar o
              catálogo?
            </p>
            <button
              type="button"
              onClick={() => navigate("modelos")}
              className="mt-6 inline-flex items-center justify-center h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] transition-colors"
            >
              Ver modelos
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked — silent */
    }
  };

  return (
    <PageShell className="bg-[var(--green-tint)]/40 min-h-screen">
      <div ref={root} className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
        <PageHeader
          eyebrow="Documento pronto"
          title={`Pronto! Seu ${modelo.nome} está formatado e com validade legal.`}
          align="center"
        />

        {/* Stage — A4 thumbnail with the striking stamp overlay */}
        <div data-suc="stage" className="relative mt-10 mx-auto max-w-md">
          <div className="relative bg-surface rounded-3xl border border-[var(--border)] shadow-[0_30px_60px_-30px_rgba(14,35,64,0.3)] p-6 sm:p-8 overflow-hidden">
            <div
              data-suc="sheet"
              className="relative mx-auto w-full max-w-[280px] aspect-[1/1.414] bg-white rounded-sm shadow-[0_18px_36px_-18px_rgba(14,35,64,0.35)] p-5 overflow-hidden"
            >
              <Selo variant="watermark" />

              <div className="relative">
                <p className="font-[family-name:var(--font-jakarta)] text-[0.7rem] font-bold text-ink uppercase tracking-wide text-center">
                  {modelo.template.titulo}
                </p>
                <div className="mt-2 h-px bg-ink/15" />
                <div className="mt-3 space-y-2">
                  {modelo.template.corpo.slice(0, 2).map((line, i) => (
                    <p
                      key={i}
                      className="text-[0.58rem] leading-relaxed text-ink/70 text-pretty"
                    >
                      {line.replace(/\{\{[^}]+\}\}/g, "____________")}
                    </p>
                  ))}
                </div>
                <div className="mt-5 flex justify-between items-end">
                  <div className="text-center">
                    <div className="w-12 border-b border-ink/40" />
                    <p className="mt-1 text-[0.45rem] text-ink/50 uppercase tracking-wide">
                      Parte 1
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 border-b border-ink/40" />
                    <p className="mt-1 text-[0.45rem] text-ink/50 uppercase tracking-wide">
                      Parte 2
                    </p>
                  </div>
                </div>
              </div>

              {/* The striking DOCFACIL stamp — the brand climax */}
              <div
                data-suc="stamp"
                className="absolute inset-0 grid place-items-center pointer-events-none"
                aria-hidden="true"
              >
                <div className="relative grid place-items-center w-36 h-36">
                  <div className="absolute inset-0 rounded-full border-[3px] border-[var(--selo-green)]/70" />
                  <div className="absolute inset-2 rounded-full border-2 border-dashed border-[var(--selo-green)]/50" />
                  <div className="text-center text-[var(--selo-green)] px-3">
                    <p className="font-[family-name:var(--font-jakarta)] font-extrabold text-lg leading-none tracking-tight">
                      DOCFACIL
                    </p>
                    <p className="mt-1 text-[0.5rem] font-semibold uppercase tracking-widest opacity-80">
                      Válido · {new Date().toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA + share + upsell */}
        <div className="mt-8 text-center">
          <button
            data-suc="cta"
            type="button"
            className="coral-pulse inline-flex items-center justify-center gap-2.5 h-14 w-full sm:w-auto sm:px-10 rounded-2xl bg-[var(--coral)] text-white font-bold text-lg hover:bg-[var(--coral-hover)] active:scale-[0.99] transition-colors"
          >
            <Download className="w-5 h-5" />
            Baixar Documento (PDF)
          </button>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              data-suc="secondary"
              type="button"
              aria-label="Compartilhar no WhatsApp"
              className="grid place-items-center w-11 h-11 rounded-full border border-[var(--border)] text-ink/70 hover:bg-[var(--blue-soft)] hover:text-[var(--blue-royal)] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              data-suc="secondary"
              type="button"
              aria-label="Enviar por e-mail"
              className="grid place-items-center w-11 h-11 rounded-full border border-[var(--border)] text-ink/70 hover:bg-[var(--blue-soft)] hover:text-[var(--blue-royal)] transition-colors"
            >
              <Mail className="w-4 h-4" />
            </button>
            <button
              data-suc="secondary"
              type="button"
              onClick={handleCopyLink}
              aria-label={copied ? "Link copiado" : "Copiar link"}
              className="grid place-items-center w-11 h-11 rounded-full border border-[var(--border)] text-ink/70 hover:bg-[var(--blue-soft)] hover:text-[var(--blue-royal)] transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[var(--selo-green)]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          {copied && (
            <p className="mt-2 text-xs text-[var(--selo-green)] font-semibold">
              Link copiado para a área de transferência
            </p>
          )}

          <p data-suc="upsell" className="mt-7 text-sm text-ink/60">
            Quer editar isso depois?{" "}
            <button
              type="button"
              onClick={() => navigate("cadastro")}
              className="text-[var(--blue-royal)] font-semibold hover:underline"
            >
              Crie uma conta grátis
            </button>
          </p>

          <button
            type="button"
            onClick={() => navigate("home")}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink/55 hover:text-[var(--blue-royal)] font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao início
          </button>
        </div>
      </div>
    </PageShell>
  );
}
