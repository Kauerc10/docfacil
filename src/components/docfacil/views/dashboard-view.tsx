"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FileText, Pencil, Download, Copy, Plus } from "lucide-react";

import { PageShell, PageHeader } from "@/components/docfacil/views/page-shell";
import { useNav } from "@/components/docfacil/nav-context";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Status = "concluido" | "rascunho";

type DocItem = {
  id: string;
  nome: string;
  criadoEm: string;
  status: Status;
};

const DOCS: DocItem[] = [
  {
    id: "doc-1",
    nome: "Contrato de Locação",
    criadoEm: "13 de julho de 2026",
    status: "concluido",
  },
  {
    id: "doc-2",
    nome: "Declaração de Residência",
    criadoEm: "8 de julho de 2026",
    status: "concluido",
  },
  {
    id: "doc-3",
    nome: "Contrato de Comodato",
    criadoEm: "2 de julho de 2026",
    status: "concluido",
  },
  {
    id: "doc-4",
    nome: "Recibo de Pagamento",
    criadoEm: "28 de junho de 2026",
    status: "concluido",
  },
  {
    id: "doc-5",
    nome: "Procuração Ad Judicia",
    criadoEm: "20 de junho de 2026",
    status: "concluido",
  },
];

type TabId = "todos" | "rascunhos" | "concluidos";

const TABS: { id: TabId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "rascunhos", label: "Rascunhos" },
  { id: "concluidos", label: "Concluídos" },
];

export function DashboardView() {
  const { navigate } = useNav();
  const [tab, setTab] = useState<TabId>("todos");
  const root = useRef<HTMLDivElement>(null);

  // Demo logic: "Rascunhos" tab has no drafts → shows empty state.
  const docs = useMemo<DocItem[]>(() => {
    if (tab === "rascunhos") return [];
    if (tab === "concluidos")
      return DOCS.filter((d) => d.status === "concluido");
    return DOCS;
  }, [tab]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const ctx = gsap.context(() => {
        gsap.fromTo(
          "[data-doc-card]",
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: {
              trigger: "[data-doc-list]",
              start: "top 88%",
              once: true,
            },
          }
        );
      }, root);
      return () => ctx.revert();
    },
    { scope: root, dependencies: [tab] }
  );

  return (
    <PageShell>
      <div
        ref={root}
        className="max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <PageHeader
            eyebrow="Sua conta"
            title="Meus Documentos"
            subtitle="Tudo o que você já criou, salvo e organizado em um só lugar."
          />
          <button
            type="button"
            onClick={() => navigate("modelos")}
            className="inline-flex items-center justify-center gap-2 self-start sm:self-auto rounded-xl bg-[var(--blue-royal)] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f46a8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--blue-royal)] focus-visible:ring-offset-[var(--paper)]"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Novo documento
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Filtrar documentos por status"
          className="mt-8 flex items-center gap-1 border-b border-[var(--border)]"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "relative px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded-t-md",
                  active
                    ? "text-[var(--blue-royal)]"
                    : "text-ink/55 hover:text-ink",
                ].join(" ")}
              >
                {t.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-px h-0.5 bg-[var(--blue-royal)] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {docs.length === 0 ? (
          <EmptyState onCreate={() => navigate("modelos")} />
        ) : (
          <ul
            data-doc-list
            className="mt-6 grid grid-cols-1 gap-4"
          >
            {docs.map((doc) => (
              <li key={doc.id} data-doc-card>
                <DocCard
                  doc={doc}
                  onOpen={() =>
                    navigate("documento-detalhe", { id: doc.id })
                  }
                  onEdit={(e) => {
                    e.stopPropagation();
                    navigate("criar", { slug: slugFromName(doc.nome) });
                  }}
                  onDownload={(e) => e.stopPropagation()}
                  onDuplicate={(e) => e.stopPropagation()}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

function slugFromName(nome: string): string {
  // Map common doc names back to slugs used in /criar.
  const map: Record<string, string> = {
    "Contrato de Locação": "contrato-locacao",
    "Declaração de Residência": "declaracao-residencia",
    "Contrato de Comodato": "comodato",
  };
  return map[nome] ?? "contrato-locacao";
}

function DocCard({
  doc,
  onOpen,
  onEdit,
  onDownload,
  onDuplicate,
}: {
  doc: DocItem;
  onOpen: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDownload: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
}) {
  const isDone = doc.status === "concluido";
  return (
    <article
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 flex items-center gap-4 hover:border-[var(--blue-royal)]/40 hover:shadow-[0_10px_24px_-14px_rgba(14,35,64,0.25)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
      aria-label={`Abrir documento ${doc.nome}, criado em ${doc.criadoEm}, status ${doc.status}`}
    >
      {/* Icon */}
      <span className="shrink-0 grid place-items-center w-12 h-12 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)]">
        <FileText className="w-5 h-5" aria-hidden="true" />
      </span>

      {/* Middle */}
      <div className="flex-1 min-w-0">
        <h3 className="font-[family-name:var(--font-jakarta)] text-base sm:text-lg font-bold text-ink truncate">
          {doc.nome}
        </h3>
        <p className="mt-0.5 text-sm text-ink/55">
          Criado em {doc.criadoEm}
        </p>
        <span
          className={[
            "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            isDone
              ? "bg-[var(--green-tint)] text-[var(--selo-green)]"
              : "bg-[var(--blue-soft)] text-[var(--blue-royal)]",
          ].join(" ")}
        >
          <span
            className={[
              "w-1.5 h-1.5 rounded-full",
              isDone ? "bg-[var(--selo-green)]" : "bg-[var(--blue-royal)]",
            ].join(" ")}
            aria-hidden="true"
          />
          {isDone ? "Concluído" : "Rascunho"}
        </span>
      </div>

      {/* Actions */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <IconAction
          label={`Editar ${doc.nome}`}
          onClick={onEdit}
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </IconAction>
        <IconAction
          label={`Baixar PDF de ${doc.nome}`}
          onClick={onDownload}
        >
          <Download className="w-4 h-4" aria-hidden="true" />
        </IconAction>
        <IconAction
          label={`Duplicar ${doc.nome}`}
          onClick={onDuplicate}
        >
          <Copy className="w-4 h-4" aria-hidden="true" />
        </IconAction>
      </div>
    </article>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid place-items-center w-9 h-9 rounded-lg text-ink/60 hover:text-[var(--blue-royal)] hover:bg-[var(--blue-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
    >
      {children}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 py-14 px-6 text-center">
      {/* Hand-drawn-ish folder illustration, not flat generic */}
      <div className="mx-auto w-32 h-32 relative" aria-hidden="true">
        <svg
          viewBox="0 0 128 128"
          fill="none"
          className="w-full h-full"
        >
          {/* Folder back */}
          <path
            d="M14 38 H50 L60 26 H114 V104 H14 Z"
            fill="var(--blue-soft)"
            stroke="var(--blue-royal)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Folder front (slightly offset, opens a bit) */}
          <path
            d="M14 54 H114 V104 H14 Z"
            fill="var(--surface)"
            stroke="var(--blue-royal)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Sheets peeking out */}
          <rect
            x="34"
            y="42"
            width="60"
            height="36"
            rx="3"
            fill="var(--surface)"
            stroke="var(--blue-royal)"
            strokeWidth="1.6"
          />
          <line
            x1="42"
            y1="52"
            x2="86"
            y2="52"
            stroke="var(--blue-royal)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.5"
          />
          <line
            x1="42"
            y1="60"
            x2="78"
            y2="60"
            stroke="var(--blue-royal)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.5"
          />
          <line
            x1="42"
            y1="68"
            x2="72"
            y2="68"
            stroke="var(--blue-royal)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* Small selo dot for brand signature */}
          <circle cx="100" cy="92" r="10" fill="var(--selo-green)" opacity="0.9" />
          <path
            d="M96 92 L99 95 L104 89.5"
            stroke="var(--surface)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h3 className="mt-6 font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink">
        Você ainda não criou nenhum documento
      </h3>
      <p className="mt-2 text-ink/60 max-w-md mx-auto">
        Escolha um modelo, preencha em conversa com a gente e baixe o PDF em
        minutos. Sem complicatedês.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--blue-royal)] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f46a8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--blue-royal)] focus-visible:ring-offset-[var(--paper)]"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        Criar meu primeiro documento
      </button>
    </div>
  );
}
