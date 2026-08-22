"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  FileText,
  Pencil,
  Download,
  Copy,
  Plus,
  AlertCircle,
  RotateCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell, PageHeader } from "@/components/docfacil/views/page-shell";
import { AuthGate } from "@/components/docfacil/views/auth-gate";
import { useNav } from "@/components/docfacil/nav-context";
import { useAuth } from "@/lib/auth-context";
import { listDocuments, duplicateDocument } from "@/lib/services/documents-service";
import {
  listAccountDrafts,
  saveAccountDraft,
  deleteAccountDraft,
  getDocumentDownloadUrl,
  type AccountDraftData,
} from "@/lib/documents/client";
import { getModel } from "@/lib/services/models-service";
import { gerarEBaixarPDF } from "@/lib/pdf/generator";
import { shouldWatermark } from "@/lib/services/plan-service";
import { MODELOS } from "@/lib/modelos";
import type { Documento } from "@/lib/types";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type TabId = "todos" | "rascunhos" | "concluidos";
type LibraryItem =
  | { kind: "document"; doc: Documento }
  | { kind: "draft"; draft: AccountDraftData; modeloNome: string };

const TABS: { id: TabId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "rascunhos", label: "Rascunhos" },
  { id: "concluidos", label: "Concluídos" },
];

export function DashboardView() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent() {
  const { navigate } = useNav();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("todos");
  const [docs, setDocs] = useState<Documento[]>([]);
  const [drafts, setDrafts] = useState<AccountDraftData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const loadLibrary = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [documentList, draftList] = await Promise.all([
        listDocuments(user.uid),
        listAccountDrafts(),
      ]);
      setDocs(documentList);
      setDrafts(draftList);
    } catch (e) {
      console.error(e);
      setError("Não foi possível carregar sua biblioteca. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLibrary();
  }, [user?.uid]);

  const allItems = useMemo<LibraryItem[]>(() => {
    const documentItems: LibraryItem[] = docs.map((doc) => ({ kind: "document", doc }));
    const draftItems: LibraryItem[] = drafts.map((draft) => ({
      kind: "draft",
      draft,
      modeloNome:
        MODELOS.find((model) => model.slug === draft.modeloSlug)?.nome ?? draft.modeloSlug,
    }));
    return [...draftItems, ...documentItems].sort((a, b) => {
      const aDate = a.kind === "draft" ? a.draft.updatedAt : a.doc.atualizadoEm;
      const bDate = b.kind === "draft" ? b.draft.updatedAt : b.doc.atualizadoEm;
      return bDate - aDate;
    });
  }, [docs, drafts]);

  const filtered = useMemo<LibraryItem[]>(() => {
    if (tab === "rascunhos") return allItems.filter((item) => item.kind === "draft");
    if (tab === "concluidos") {
      return allItems.filter(
        (item) => item.kind === "document" && item.doc.status === "concluido"
      );
    }
    return allItems;
  }, [allItems, tab]);

  useGSAP(
    () => {
      if (loading || error || filtered.length === 0) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const ctx = gsap.context(() => {
        const cards = root.current?.querySelectorAll("[data-doc-card]");
        if (!cards || cards.length === 0) return;
        gsap.fromTo(
          cards,
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
    { scope: root, dependencies: [tab, filtered.length, loading, error] }
  );

  async function handleDuplicate(doc: Documento) {
    setDuplicatingId(doc.id);
    try {
      const duplicate = await duplicateDocument(doc.id);
      if (!duplicate) throw new Error("Documento não encontrado.");
      const draft = await saveAccountDraft({
        modeloSlug: duplicate.modeloSlug,
        respostas: duplicate.respostas,
        stepIndex: 0,
        clausulasSelecionadas: duplicate.clausulasSelecionadas,
        extrasPorClausula: duplicate.extrasPorClausula,
      });
      toast.success("Cópia criada como rascunho.", {
        description: "As respostas já estão preenchidas para você revisar.",
      });
      navigate("criar", { slug: draft.modeloSlug, draftId: draft.id });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível duplicar o documento.");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDownload(doc: Documento) {
    setDownloadingId(doc.id);
    try {
      if (doc.id.startsWith("demo-")) {
        const model = await getModel(doc.modeloSlug);
        if (!model) throw new Error("Modelo não encontrado.");
        await gerarEBaixarPDF(model, doc.respostas, doc.modeloSlug, {
          watermark: shouldWatermark(user),
        });
      } else {
        const { downloadUrl } = await getDocumentDownloadUrl(doc.id);
        window.location.href = downloadUrl;
      }
      toast.success("Download iniciado.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível baixar o PDF. Tente novamente.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDeleteDraft(draftId: string) {
    setDeletingDraftId(draftId);
    try {
      await deleteAccountDraft(draftId);
      setDrafts((current) => current.filter((draft) => draft.id !== draftId));
      toast.success("Rascunho excluído.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível excluir o rascunho.");
    } finally {
      setDeletingDraftId(null);
    }
  }

  const countForTab = (tabId: TabId) => {
    if (tabId === "todos") return allItems.length;
    if (tabId === "rascunhos") return drafts.length;
    return docs.filter((doc) => doc.status === "concluido").length;
  };

  return (
    <PageShell>
      <div ref={root} className="max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <PageHeader
            eyebrow="Sua conta"
            title="Meus Documentos"
            subtitle="Documentos concluídos e rascunhos salvos na sua conta, juntos e fáceis de retomar."
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

        <div
          role="tablist"
          aria-label="Filtrar documentos por status"
          className="mt-8 flex items-center gap-1 border-b border-[var(--border)]"
        >
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setTab(item.id)}
                className={[
                  "relative px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded-t-md inline-flex items-center gap-2",
                  active ? "text-[var(--blue-royal)]" : "text-ink/55 hover:text-ink",
                ].join(" ")}
              >
                {item.label}
                {!loading && (
                  <span
                    className={[
                      "text-xs px-1.5 py-0.5 rounded-full tabular-nums",
                      active
                        ? "bg-[var(--blue-soft)] text-[var(--blue-royal)]"
                        : "bg-[var(--blue-soft)]/50 text-ink/60",
                    ].join(" ")}
                  >
                    {countForTab(item.id)}
                  </span>
                )}
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

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadLibrary()} />
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => navigate("modelos")} tab={tab} />
        ) : (
          <ul data-doc-list className="mt-6 grid grid-cols-1 gap-4">
            {filtered.map((item) => {
              if (item.kind === "draft") {
                const draft = item.draft;
                return (
                  <li key={`draft:${draft.id}`} data-doc-card>
                    <LibraryCard
                      name={item.modeloNome}
                      date={draft.updatedAt}
                      status="rascunho"
                      onOpen={() => navigate("criar", { slug: draft.modeloSlug, draftId: draft.id })}
                      onEdit={(event) => {
                        event.stopPropagation();
                        navigate("criar", { slug: draft.modeloSlug, draftId: draft.id });
                      }}
                      onDelete={(event) => {
                        event.stopPropagation();
                        void handleDeleteDraft(draft.id);
                      }}
                      deleting={deletingDraftId === draft.id}
                    />
                  </li>
                );
              }

              const doc = item.doc;
              return (
                <li key={`document:${doc.id}`} data-doc-card>
                  <LibraryCard
                    name={doc.modeloNome}
                    date={doc.criadoEm}
                    status={doc.status === "concluido" ? "concluido" : "processando"}
                    onOpen={() => navigate("documento-detalhe", { id: doc.id })}
                    onEdit={(event) => {
                      event.stopPropagation();
                      navigate("criar", { slug: doc.modeloSlug, id: doc.id });
                    }}
                    onDownload={(event) => {
                      event.stopPropagation();
                      void handleDownload(doc);
                    }}
                    onDuplicate={(event) => {
                      event.stopPropagation();
                      void handleDuplicate(doc);
                    }}
                    downloading={downloadingId === doc.id}
                    duplicating={duplicatingId === doc.id}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

function DashboardSkeleton() {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 flex items-center gap-4 animate-pulse"
        >
          <div className="shrink-0 w-12 h-12 rounded-full bg-[var(--blue-soft)]/60" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[var(--blue-soft)]/50 rounded w-2/5" />
            <div className="h-3 bg-[var(--blue-soft)]/40 rounded w-1/4" />
            <div className="h-5 bg-[var(--blue-soft)]/40 rounded-full w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-10 rounded-2xl border border-[var(--coral)]/30 bg-[var(--coral)]/5 px-6 py-10 text-center">
      <div
        className="mx-auto w-12 h-12 rounded-full bg-[var(--coral)]/15 text-[var(--coral)] grid place-items-center"
        aria-hidden="true"
      >
        <AlertCircle className="w-6 h-6" />
      </div>
      <p className="mt-4 text-ink/80 font-medium">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-paper transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
      >
        <RotateCw className="w-4 h-4" aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  );
}

type LibraryStatus = "rascunho" | "concluido" | "processando";

function LibraryCard({
  name,
  date,
  status,
  onOpen,
  onEdit,
  onDownload,
  onDuplicate,
  onDelete,
  downloading = false,
  duplicating = false,
  deleting = false,
}: {
  name: string;
  date: number;
  status: LibraryStatus;
  onOpen: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDownload?: (e: React.MouseEvent) => void;
  onDuplicate?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  downloading?: boolean;
  duplicating?: boolean;
  deleting?: boolean;
}) {
  const dateLabel = new Date(date).toLocaleDateString("pt-BR");
  const statusLabel =
    status === "concluido" ? "Concluído" : status === "rascunho" ? "Rascunho" : "Processando";
  const positive = status === "concluido";

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
      aria-label={`Abrir ${name}, ${statusLabel.toLowerCase()}`}
    >
      <span className="shrink-0 grid place-items-center w-12 h-12 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)]">
        <FileText className="w-5 h-5" aria-hidden="true" />
      </span>

      <div className="flex-1 min-w-0">
        <h3 className="font-[family-name:var(--font-jakarta)] text-base sm:text-lg font-bold text-ink truncate">
          {name}
        </h3>
        <p className="mt-0.5 text-sm text-ink/55">
          {status === "rascunho" ? "Atualizado" : "Criado"} em {dateLabel}
        </p>
        <span
          className={[
            "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            positive
              ? "bg-[var(--green-tint)] text-[var(--selo-green)]"
              : "bg-[var(--blue-soft)] text-[var(--blue-royal)]",
          ].join(" ")}
        >
          <span
            className={[
              "w-1.5 h-1.5 rounded-full",
              positive ? "bg-[var(--selo-green)]" : "bg-[var(--blue-royal)]",
            ].join(" ")}
            aria-hidden="true"
          />
          {statusLabel}
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <IconAction label={`${status === "rascunho" ? "Continuar" : "Editar"} ${name}`} onClick={onEdit}>
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </IconAction>
        {onDownload && (
          <IconAction label={`Baixar PDF de ${name}`} onClick={onDownload} disabled={downloading}>
            {downloading ? <RotateCw className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />}
          </IconAction>
        )}
        {onDuplicate && (
          <IconAction label={`Duplicar ${name}`} onClick={onDuplicate} disabled={duplicating}>
            {duplicating ? <RotateCw className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          </IconAction>
        )}
        {onDelete && (
          <IconAction label={`Excluir rascunho ${name}`} onClick={onDelete} disabled={deleting}>
            {deleting ? <RotateCw className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
          </IconAction>
        )}
      </div>
    </article>
  );
}

function IconAction({
  label,
  onClick,
  children,
  disabled = false,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid place-items-center w-9 h-9 rounded-lg text-ink/60 hover:text-[var(--blue-royal)] hover:bg-[var(--blue-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function EmptyState({ onCreate, tab }: { onCreate: () => void; tab: TabId }) {
  const isFilteredEmpty = tab !== "todos";
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 py-14 px-6 text-center">
      <div className="mx-auto w-24 h-24 grid place-items-center rounded-3xl bg-[var(--blue-soft)] text-[var(--blue-royal)]" aria-hidden="true">
        <FileText className="w-10 h-10" />
      </div>
      <h3 className="mt-6 font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink">
        {isFilteredEmpty
          ? tab === "rascunhos"
            ? "Você não tem rascunhos"
            : "Nenhum documento concluído ainda"
          : "Você ainda não criou nenhum documento"}
      </h3>
      <p className="mt-2 text-ink/60 max-w-md mx-auto">
        {isFilteredEmpty
          ? "Quando você salvar ou concluir documentos nesta categoria, eles aparecerão aqui."
          : "Escolha um modelo, responda às perguntas e deixe o DocFácil cuidar da estrutura do documento."}
      </p>
      {!isFilteredEmpty && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--blue-royal)] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f46a8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--blue-royal)] focus-visible:ring-offset-[var(--paper)]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Criar meu primeiro documento
        </button>
      )}
    </div>
  );
}
