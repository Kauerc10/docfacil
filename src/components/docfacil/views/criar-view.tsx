"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Selo } from "../selo";
import { useNav } from "../nav-context";
import { getModelo, type CampoModelo } from "@/lib/modelos";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * CriarView — the heart of the DocFacil product.
 *
 * A split-screen "Concierge" filling flow: on the left, one question at a
 * time with a large input (the way a notary's assistant would guide you);
 * on the right, an A4 "Ateliê" preview that fills in live as you answer,
 * with a brief blue highlight (field-land) every time a placeholder lands.
 *
 * Desktop = side-by-side; mobile = tabs (Perguntas / Visualizar).
 * Wraps in a custom `min-h-screen pt-[72px] flex flex-col` shell so the
 * split screen can fill the viewport height without PageShell's padding.
 */
export function CriarView() {
  const { params, navigate } = useNav();
  const slug = params.slug ?? "";
  const modelo = getModelo(slug);

  const [step, setStep] = useState(0);
  // `answers` holds the live draft for every key — when the user types, the
  // Ateliê preview updates instantly; when they advance, the answer is
  // already saved. No separate `draft` state, no effect-reset cycle.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [mobileTab, setMobileTab] = useState<"perguntas" | "visualizar">("perguntas");
  const [pulseProgress, setPulseProgress] = useState(false);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const questionRef = useRef<HTMLDivElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);

  const campos = modelo?.campos ?? [];
  const total = campos.length;
  const current: CampoModelo | undefined = campos[step];

  // Focus the input whenever a new question appears.
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [step]);

  // GSAP entrance for the current question bubble.
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!questionRef.current) return;
      gsap.fromTo(
        questionRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
    },
    { scope: root, dependencies: [step] }
  );

  if (!modelo) {
    return (
      <div className="min-h-[70vh] pt-[72px] grid place-items-center px-4">
        <div className="text-center max-w-md">
          <Selo variant="mark" className="w-10 h-10 mx-auto" />
          <h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-2xl font-bold text-ink">
            Modelo não encontrado
          </h2>
          <p className="mt-2 text-ink/65">
            O documento que você procura não está disponível agora. Explore
            nosso catálogo completo.
          </p>
          <button
            onClick={() => navigate("modelos")}
            className="mt-6 inline-flex items-center justify-center h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] transition-colors"
          >
            Ver todos os modelos
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (value: string) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.key]: value }));
  };

  const handleAvancar = () => {
    if (!current) return;
    const value = (answers[current.key] ?? "").trim();
    if (!value) {
      // Brief shake to signal the field is required.
      if (inputRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.fromTo(
          inputRef.current,
          { x: -6 },
          { x: 0, duration: 0.4, ease: "elastic.out(1, 0.4)" }
        );
      }
      inputRef.current?.focus();
      return;
    }
    // Persist the trimmed value so the preview/history shows a clean string.
    setAnswers((prev) => ({ ...prev, [current.key]: value }));

    // Brief progress-pulse to celebrate the completed step.
    setPulseProgress(true);
    window.setTimeout(() => setPulseProgress(false), 1300);

    if (step + 1 >= total) {
      const id = `${slug}-${Date.now().toString(36)}`;
      navigate("sucesso", { slug, id });
      return;
    }
    setStep(step + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAvancar();
    }
  };

  const progressPct = total > 0 ? (step / total) * 100 : 0;
  const history = campos.slice(0, step);
  const isLast = step + 1 >= total;

  return (
    <div ref={root} className="min-h-screen pt-[72px] flex flex-col bg-paper">
      {/* Top bar: voltar + progress + step counter */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-[var(--border)] bg-paper">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("modelo-detalhe", { slug })}
              className="inline-flex items-center gap-1 text-sm font-semibold text-ink/65 hover:text-[var(--blue-royal)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <span className="ml-auto text-sm font-medium text-ink/60">
              passo{" "}
              <span className="text-ink font-bold">
                {Math.min(step + 1, total)}
              </span>{" "}
              de {total}
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-[var(--blue-soft)] overflow-hidden">
            <div
              className={cn(
                "h-full bg-[var(--selo-green)] transition-[width] duration-500 ease-out rounded-full",
                pulseProgress && "progress-pulse"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden flex border-b border-[var(--border)] bg-paper sticky top-[72px] z-10">
        {(["perguntas", "visualizar"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMobileTab(t)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold transition-colors border-b-2 capitalize",
              mobileTab === t
                ? "text-[var(--blue-royal)] border-[var(--blue-royal)]"
                : "text-ink/55 border-transparent hover:text-ink"
            )}
          >
            {t === "perguntas" ? "Perguntas" : "Visualizar"}
          </button>
        ))}
      </div>

      {/* Split screen */}
      <div className="flex-1 lg:grid lg:grid-cols-[45%_55%]">
        {/* Left — Concierge chat */}
        <div
          className={cn(
            "bg-paper p-6 sm:p-8 lg:p-10 flex flex-col gap-5 min-h-[60vh] lg:min-h-0 overflow-y-auto scroll-fine",
            mobileTab === "perguntas" ? "flex" : "hidden lg:flex"
          )}
        >
          {/* History of previous Q&A — faded, sits above the current question */}
          {history.length > 0 && (
            <div className="space-y-4 opacity-60">
              {history.map((c) => (
                <div key={c.key} className="space-y-2">
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--blue-soft)] grid place-items-center">
                      <Selo variant="mark" className="w-4 h-4" />
                    </div>
                    <div className="bg-surface border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]">
                      <p className="text-ink/80 text-sm leading-relaxed">
                        {c.pergunta}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto bg-[var(--blue-royal)] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%] w-fit">
                    <p className="text-sm break-words">{answers[c.key]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current question + input — pinned to the bottom of the column */}
          {current && (
            <div ref={questionRef} className="mt-auto space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--blue-soft)] grid place-items-center">
                  <Selo variant="mark" className="w-5 h-5" />
                </div>
                <div className="bg-surface border border-[var(--border)] rounded-2xl rounded-tl-sm px-5 py-3.5 max-w-[85%]">
                  <p className="text-ink text-base sm:text-lg leading-relaxed font-medium">
                    {current.pergunta}
                  </p>
                </div>
              </div>

              <div>
                {current.tipo === "textarea" ? (
                  <textarea
                    ref={(el) => {
                      inputRef.current = el;
                    }}
                    value={answers[current.key] ?? ""}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={current.placeholder}
                    aria-label={current.pergunta}
                    rows={3}
                    className="w-full min-h-[3.5rem] px-4 py-3 text-xl rounded-xl bg-surface border border-[var(--blue-soft)] focus:border-[var(--blue-royal)] outline-none transition-colors placeholder:text-ink/40 resize-none"
                  />
                ) : (
                  <input
                    ref={(el) => {
                      inputRef.current = el;
                    }}
                    type="text"
                    value={answers[current.key] ?? ""}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={current.placeholder}
                    aria-label={current.pergunta}
                    inputMode={current.tipo === "number" ? "decimal" : "text"}
                    className="w-full h-14 px-4 text-xl rounded-xl bg-surface border border-[var(--blue-soft)] focus:border-[var(--blue-royal)] outline-none transition-colors placeholder:text-ink/40"
                  />
                )}

                {current.microcopy && (
                  <p className="mt-2 pen-note text-sm pl-1">{current.microcopy}</p>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAvancar}
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] active:scale-[0.99] transition-all"
                  >
                    {isLast ? "Finalizar documento" : "Avançar"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <kbd className="hidden sm:inline-flex text-xs text-ink/45 px-2 py-1.5 rounded border border-[var(--border)]">
                    Enter ↵
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — Ateliê live preview */}
        <div
          className={cn(
            "bg-[#efe9dd] p-6 sm:p-8 grid place-items-center min-h-[60vh] lg:min-h-0 relative",
            mobileTab === "visualizar" ? "grid" : "hidden lg:grid"
          )}
        >
          <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--green-tint)] border border-[var(--selo-green)]/30 text-[var(--selo-green)] text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--selo-green)] animate-pulse" />
            atualizando ao vivo
          </div>

          {/* A4 sheet */}
          <div className="relative w-full max-w-[340px] aspect-[1/1.414] bg-white shadow-[0_20px_40px_-20px_rgba(14,35,64,0.3)] rounded-sm p-6 overflow-hidden">
            <Selo variant="watermark" />

            <div className="relative">
              <p className="font-[family-name:var(--font-jakarta)] text-xs font-bold text-ink uppercase tracking-wide text-center">
                {modelo.template.titulo}
              </p>
              <div className="mt-3 h-px bg-ink/15" />

              <div className="mt-3 space-y-3">
                {modelo.template.corpo.map((line, idx) => (
                  <p
                    key={idx}
                    className="text-[0.7rem] leading-relaxed text-ink/80 text-pretty"
                  >
                    {renderTemplateLine(line, answers)}
                  </p>
                ))}
              </div>

              <div className="mt-8 flex justify-between items-end">
                <div className="text-center">
                  <div className="w-16 border-b border-ink/40" />
                  <p className="mt-1 text-[0.5rem] text-ink/50 uppercase tracking-wide">
                    Parte 1
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 border-b border-ink/40" />
                  <p className="mt-1 text-[0.5rem] text-ink/50 uppercase tracking-wide">
                    Parte 2
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Render a single template line, replacing every `{{key}}` placeholder with
 * either the user's answer (wrapped in a `.field-land` span that flashes
 * blue → transparent on mount) or a dotted-underline placeholder.
 *
 * The React key includes a `-filled` / `-empty` suffix so the span remounts
 * (and the CSS animation replays) the moment a field transitions from empty
 * to filled — i.e. on the user's first keystroke for that question.
 */
function renderTemplateLine(line: string, answers: Record<string, string>) {
  const parts = line.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    const m = part.match(/^\{\{([^}]+)\}\}$/);
    if (m) {
      const key = m[1];
      const value = answers[key];
      if (value) {
        return (
          <span
            key={`${key}-${i}-filled`}
            className="field-land font-semibold text-ink rounded px-0.5"
          >
            {value}
          </span>
        );
      }
      return (
        <span
          key={`${key}-${i}-empty`}
          aria-label={`campo ${key} a preencher`}
          className="inline-block border-b border-dotted border-ink/40 min-w-[3rem] px-1 align-baseline"
        >
          &nbsp;
        </span>
      );
    }
    return <span key={`t-${i}`}>{part}</span>;
  });
}
