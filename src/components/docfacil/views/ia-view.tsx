"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowLeft,
  Check,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { useNav } from "@/components/docfacil/nav-context";
import { PageHeader, PageShell } from "@/components/docfacil/views/page-shell";
import { Selo } from "@/components/docfacil/selo";

gsap.registerPlugin(useGSAP);

type Mensagem =
  | { id: string; tipo: "system"; kind: "texto"; conteudo: string }
  | { id: string; tipo: "user"; conteudo: string }
  | { id: string; tipo: "system"; kind: "rascunho" }
  | { id: string; tipo: "system"; kind: "confirmado" };

type Fase = "aguardando" | "processando" | "rascunho" | "confirmado";

const ESTRUTURA_PROPOSTA = [
  {
    titulo: "Partes envolvidas",
    desc: "Nome completo, CPF e qualificação das duas partes.",
  },
  {
    titulo: "Objeto",
    desc: "O que está sendo acordado, descrito com clareza.",
  },
  {
    titulo: "Condições",
    desc: "Prazos, valores, obrigações e direitos de cada lado.",
  },
  {
    titulo: "Assinaturas",
    desc: "Local, data e assinatura das partes para validade.",
  },
];

/**
 * IAView (spec 4.6) — gerador de documentos por IA.
 *
 * Fluxo demo (sem chamada real a API): o usuário descreve a necessidade, a IA
 * "pensa" (indicador de digitação) e devolve uma estrutura proposta em 4
 * seções. O usuário confirma ou refaz. Em produção, "Seguir" dispara o fluxo
 * /criar com a estrutura montada.
 */
export function IAView() {
  const root = useRef<HTMLDivElement>(null);
  const { navigate } = useNav();
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: "sys-1",
      tipo: "system",
      kind: "texto",
      conteudo:
        "Me conta em poucas palavras o que você precisa documentar. Por exemplo: 'preciso de um contrato de aluguel de uma sala comercial'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [fase, setFase] = useState<Fase>("aguardando");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Entrada GSAP para cada nova bolha (com respeito a reduced-motion).
  useGSAP(
    () => {
      if (reduced) return;
      gsap.from("[data-bubble='new']", {
        y: 16,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.1,
      });
    },
    { scope: root, dependencies: [mensagens.length, typing] }
  );

  // Auto-scroll para a última bolha.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [mensagens, typing]);

  // Limpa timers pendentes ao desmontar.
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const enviar = () => {
    const texto = input.trim();
    if (!texto || fase === "processando") return;

    const userMsg: Mensagem = {
      id: `u-${Date.now()}`,
      tipo: "user",
      conteudo: texto,
    };
    setMensagens((m) => [...m, userMsg]);
    setInput("");
    setFase("processando");

    // Indicador de digitação
    const t1 = setTimeout(() => setTyping(true), reduced ? 0 : 350);
    // Resposta da IA (estrutura proposta)
    const t2 = setTimeout(
      () => {
        setTyping(false);
        setMensagens((m) => [
          ...m,
          { id: `s-${Date.now()}`, tipo: "system", kind: "rascunho" },
        ]);
        setFase("rascunho");
      },
      reduced ? 0 : 350 + 1600
    );
    timers.current.push(t1, t2);
  };

  const refazer = () => {
    // Remove o último rascunho e volta a perguntar.
    setMensagens((m) => {
      const last = m[m.length - 1];
      if (last && last.tipo === "system" && last.kind === "rascunho") {
        return m.slice(0, -1);
      }
      return m;
    });
    setMensagens((m) => [
      ...m,
      {
        id: `s-${Date.now()}`,
        tipo: "system",
        kind: "texto",
        conteudo:
          "Sem problema. Me conta de novo, com outras palavras, o que você precisa.",
      },
    ]);
    setFase("aguardando");
  };

  const seguir = () => {
    setMensagens((m) => [
      ...m,
      { id: `s-${Date.now()}`, tipo: "system", kind: "confirmado" },
    ]);
    setFase("confirmado");
  };

  const irParaEditor = () => navigate("criar", { slug: "ia-gerado" });

  return (
    <PageShell>
      <div ref={root} className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="inline-flex items-center gap-1.5 text-ink/65 hover:text-[var(--blue-royal)] font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="mt-6">
          <PageHeader
            eyebrow="Gerador com IA"
            title="Descreva o que você precisa. A IA monta o documento."
            subtitle="Sem jargão, sem formulário gigante. Conte o seu caso e a IA propõe uma estrutura — você aprova antes de qualquer coisa."
          />
        </div>

        {/* Janela de conversa */}
        <div className="mt-8 bg-surface border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          <div
            ref={scrollRef}
            className="scroll-fine max-h-[55vh] min-h-[320px] overflow-y-auto px-4 sm:px-6 py-6 space-y-4 bg-paper"
            aria-live="polite"
            aria-label="Conversa com a IA do DocFacil"
          >
            {mensagens.map((m) => {
              if (m.tipo === "user") {
                return <UserBubble key={m.id} id={m.id} texto={m.conteudo} />;
              }
              if (m.kind === "rascunho") {
                return (
                  <SystemBubble key={m.id} id={m.id}>
                    <RascunhoEstrutura onSeguir={seguir} onRefazer={refazer} />
                  </SystemBubble>
                );
              }
              if (m.kind === "confirmado") {
                return (
                  <SystemBubble key={m.id} id={m.id}>
                    <Confirmacao onIr={irParaEditor} />
                  </SystemBubble>
                );
              }
              return (
                <SystemBubble key={m.id} id={m.id}>
                  {m.conteudo}
                </SystemBubble>
              );
            })}

            {typing && (
              <div data-bubble="new" className="flex items-start gap-3">
                <Avatar />
                <div className="bg-surface border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--blue-royal)]/60 animate-bounce [animation-delay:-0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--blue-royal)]/60 animate-bounce [animation-delay:-0.1s]" />
                  <span className="w-2 h-2 rounded-full bg-[var(--blue-royal)]/60 animate-bounce" />
                  <span className="sr-only">A IA está digitando…</span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-[var(--border)] bg-surface p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <label htmlFor="ia-input" className="sr-only">
                Descreva o documento que você precisa
              </label>
              <textarea
                id="ia-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                rows={3}
                placeholder="Ex: preciso de um contrato para emprestar minha câmera fotográfica para um amigo por 2 meses…"
                disabled={fase === "processando" || fase === "confirmado"}
                className="flex-1 min-h-32 sm:min-h-0 sm:h-auto resize-none rounded-xl bg-[var(--paper)] border border-[var(--border)] px-4 py-3 text-lg text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-[var(--blue-royal)]/35 focus:border-[var(--blue-royal)] transition-shadow disabled:opacity-55"
              />
              <button
                type="button"
                onClick={enviar}
                disabled={
                  !input.trim() ||
                  fase === "processando" ||
                  fase === "confirmado"
                }
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] transition-colors shadow-sm disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Enviar
              </button>
            </div>
            <p className="mt-2 text-xs text-ink/45 hidden sm:block">
              Dica: <kbd className="font-mono">⌘/Ctrl + Enter</kbd> envia a
              mensagem.
            </p>
          </div>
        </div>

        {/* Aviso discreto de validação */}
        <p className="mt-5 text-sm italic text-ink/45 text-center px-4">
          Documentos gerados por IA passam por revisão automática de estrutura,
          mas recomendamos validação para casos complexos.
        </p>
      </div>
    </PageShell>
  );
}

/** Avatar da IA — Selo mark num círculo blue-soft. */
function Avatar() {
  return (
    <div className="shrink-0 grid place-items-center w-9 h-9 rounded-full bg-[var(--blue-soft)]">
      <Selo variant="mark" className="w-5 h-5" />
    </div>
  );
}

function SystemBubble({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div data-bubble="new" data-msg={id} className="flex items-start gap-3">
      <Avatar />
      <div className="bg-surface border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%] text-ink/85 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ id, texto }: { id: string; texto: string }) {
  return (
    <div data-bubble="new" data-msg={id} className="flex justify-end">
      <div className="bg-[var(--blue-royal)] text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] leading-relaxed">
        {texto}
      </div>
    </div>
  );
}

/** Card com a estrutura proposta pela IA + botões de ação. */
function RascunhoEstrutura({
  onSeguir,
  onRefazer,
}: {
  onSeguir: () => void;
  onRefazer: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-ink/85">A IA sugere esta estrutura. Quer seguir?</p>
      <ol className="space-y-2">
        {ESTRUTURA_PROPOSTA.map((s, i) => (
          <li
            key={s.titulo}
            className="flex items-start gap-3 bg-[var(--paper)] border border-[var(--border)] rounded-xl px-3 py-2.5"
          >
            <span className="mt-0.5 grid place-items-center w-6 h-6 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)] text-xs font-bold">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-ink leading-tight">{s.titulo}</p>
              <p className="text-sm text-ink/60 leading-snug">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onSeguir}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[var(--blue-royal)] text-white font-semibold text-sm hover:bg-[var(--navy)] transition-colors"
        >
          <Check className="w-4 h-4" />
          Seguir com essa estrutura
        </button>
        <button
          type="button"
          onClick={onRefazer}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-[var(--blue-royal)]/35 text-[var(--blue-royal)] font-semibold text-sm hover:bg-[var(--blue-soft)] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refazer
        </button>
      </div>
    </div>
  );
}

function Confirmacao({ onIr }: { onIr: () => void }) {
  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 mt-1 text-[var(--selo-green)] shrink-0" />
        <span>
          Estrutura confirmada! Estamos preparando o editor com essas seções
          para você preencher.
        </span>
      </p>
      <button
        type="button"
        onClick={onIr}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[var(--selo-green)] text-white font-semibold hover:bg-[var(--selo-green)]/90 transition-colors"
      >
        Ir para o editor
      </button>
    </div>
  );
}
