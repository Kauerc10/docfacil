"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ChevronLeft,
  Pencil,
  Download,
  Copy,
  Trash,
  Clock,
  ZoomIn,
  Loader2,
  FileQuestion,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/docfacil/views/page-shell";
import { AuthGate } from "@/components/docfacil/views/auth-gate";
import { useNav } from "@/components/docfacil/nav-context";
import { Selo } from "@/components/docfacil/selo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getDocument,
  deleteDocument,
  duplicateDocument,
} from "@/lib/services/documents-service";
import { getModel } from "@/lib/services/models-service";
import { gerarEBaixarPDF } from "@/lib/pdf/generator";
import type { Documento, Modelo } from "@/lib/types";

gsap.registerPlugin(useGSAP);

export function DocumentoDetalheView() {
  return (
    <AuthGate>
      <DocumentoDetalheContent />
    </AuthGate>
  );
}

function DocumentoDetalheContent() {
  const { params, navigate } = useNav();
  const root = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false);
  const [doc, setDoc] = useState<Documento | null>(null);
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "download" | "duplicate" | "delete" | null
  >(null);

  const docId = params.id ?? "";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!docId) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);
      try {
        const d = await getDocument(docId);
        if (cancelled) return;
        if (!d) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setDoc(d);
        // Load modelo in parallel — non-blocking: preview can render
        // without it, but it's nice to show the template's corpo.
        getModel(d.modeloSlug)
          .then((m) => {
            if (!cancelled) setModelo(m);
          })
          .catch((e) => console.error("Failed to load modelo:", e));
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível carregar o documento.");
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        "[data-det='col']",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
          stagger: 0.12,
        }
      );
    },
    { scope: root, dependencies: [doc?.id] }
  );

  async function handleDownload() {
    if (!doc) return;
    if (!modelo) {
      toast.error("Modelo não encontrado para gerar o PDF.");
      return;
    }
    setActionLoading("download");
    try {
      await gerarEBaixarPDF(modelo, doc.respostas, doc.modeloSlug);
      toast.success("PDF gerado!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDuplicate() {
    if (!doc) return;
    setActionLoading("duplicate");
    try {
      const novo = await duplicateDocument(doc.id);
      if (novo) {
        toast.success("Documento duplicado!");
        navigate("dashboard");
      } else {
        toast.error("Não foi possível duplicar o documento.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao duplicar documento.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!doc) return;
    setActionLoading("delete");
    try {
      await deleteDocument(doc.id);
      toast.success("Documento excluído.");
      navigate("dashboard");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir documento.");
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
          <DetalheSkeleton />
        </div>
      </PageShell>
    );
  }

  if (notFound || !doc) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
          <div
            className="mx-auto w-16 h-16 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)] grid place-items-center"
            aria-hidden="true"
          >
            <FileQuestion className="w-7 h-7" />
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Documento não encontrado
          </h1>
          <p className="mt-3 text-ink/65 text-base leading-relaxed">
            O documento que você procura pode ter sido excluído, ou o link está
            incorreto.
          </p>
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--blue-royal)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--navy)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Voltar para Meus Documentos
          </button>
        </div>
      </PageShell>
    );
  }

  const isDone = doc.status === "concluido";
  const criadoFmt = new Date(doc.criadoEm).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const atualizadoFmt = new Date(doc.atualizadoEm).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Build historico entries from real timestamps.
  const historico: { acao: string; quando: string }[] = [
    {
      acao: `Documento criado a partir do modelo ${doc.modeloNome}`,
      quando: `${criadoFmt}`,
    },
  ];
  if (doc.atualizadoEm !== doc.criadoEm) {
    historico.unshift({
      acao: "Documento atualizado",
      quando: `${atualizadoFmt}`,
    });
  }

  // Preview paragraphs: prefer the model's template filled with respostas.
  const previewParagraphs =
    modelo?.template.corpo?.map((linha) => fillTemplate(linha, doc.respostas)) ??
    fallbackPreview(doc);

  return (
    <PageShell>
      <div
        ref={root}
        className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12"
      >
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-[var(--blue-royal)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded-md px-1 py-0.5"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Voltar para Meus Documentos
        </button>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12">
          {/* LEFT — A4 preview */}
          <div data-det="col" className="order-2 lg:order-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink/60 uppercase tracking-wider">
                Pré-visualização
              </h2>
              <button
                type="button"
                onClick={() => setZoom((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/55 hover:text-[var(--blue-royal)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded-md px-2 py-1"
                aria-label={zoom ? "Reduzir zoom" : "Ampliar pré-visualização"}
              >
                <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
                {zoom ? "Voltar ao tamanho normal" : "Ampliar"}
              </button>
            </div>

            <div
              className={[
                "flex justify-center transition-all",
                zoom ? "scale-[1.04] origin-top" : "scale-100",
              ].join(" ")}
            >
              <A4Preview
                docId={doc.id}
                titulo={modelo?.template.titulo ?? doc.modeloNome}
                paragraphs={previewParagraphs}
              />
            </div>

            <p className="mt-3 text-center text-xs text-ink/45">
              Prévia do PDF gerado. A versão final segue em formato A4 paginado,
              pronta para impressão.
            </p>
          </div>

          {/* RIGHT — metadata + actions */}
          <div data-det="col" className="order-1 lg:order-2 space-y-6">
            <div>
              <p className="text-[var(--selo-green)] font-semibold text-xs uppercase tracking-wider">
                Documento
              </p>
              <h1 className="mt-1.5 font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                {doc.modeloNome}
              </h1>
            </div>

            {/* Metadata card */}
            <section
              aria-label="Informações do documento"
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <dl className="space-y-3 text-sm">
                <MetaRow label="Criado em" value={criadoFmt} />
                <MetaRow label="Última edição" value={atualizadoFmt} />
                <div className="flex items-center justify-between gap-3 pt-1">
                  <dt className="text-ink/55">Status</dt>
                  <dd>
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                        isDone
                          ? "bg-[var(--green-tint)] text-[var(--selo-green)]"
                          : "bg-[var(--blue-soft)] text-[var(--blue-royal)]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "w-1.5 h-1.5 rounded-full",
                          isDone
                            ? "bg-[var(--selo-green)]"
                            : "bg-[var(--blue-royal)]",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      {isDone ? "Concluído" : "Rascunho"}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            {/* Actions */}
            <section aria-label="Ações" className="space-y-2.5">
              <ActionButton
                primary
                icon={<Pencil className="w-4 h-4" aria-hidden="true" />}
                label="Editar respostas"
                onClick={() =>
                  navigate("criar", { slug: doc.modeloSlug })
                }
              />
              <ActionButton
                icon={
                  actionLoading === "download" ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4" aria-hidden="true" />
                  )
                }
                label={actionLoading === "download" ? "Gerando PDF..." : "Baixar PDF"}
                onClick={handleDownload}
                disabled={actionLoading !== null}
              />
              <ActionButton
                icon={
                  actionLoading === "duplicate" ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  )
                }
                label={actionLoading === "duplicate" ? "Duplicando..." : "Duplicar"}
                onClick={handleDuplicate}
                disabled={actionLoading !== null}
              />

              <DeleteAction
                docNome={doc.modeloNome}
                loading={actionLoading === "delete"}
                disabled={actionLoading !== null && actionLoading !== "delete"}
                onConfirm={handleDelete}
              />
            </section>

            {/* Histórico */}
            <section
              aria-label="Histórico de alterações"
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex items-center gap-2 text-ink/60">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">
                  Histórico
                </h2>
              </div>
              <ol className="mt-4 space-y-3">
                {historico.map((h, i) => (
                  <li key={i} className="relative pl-5">
                    <span
                      className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-[var(--blue-royal)]"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-ink/85">{h.acao}</p>
                    <p className="text-xs text-ink/50 mt-0.5">{h.quando}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/** Substitui {{key}} no template pelos valores das respostas. */
function fillTemplate(template: string, respostas: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = respostas[key];
    return v && v.trim() ? v : "______________________";
  });
}

/** Caso o modelo não esteja disponível, montamos um preview simples das respostas. */
function fallbackPreview(doc: Documento): string[] {
  const entries = Object.entries(doc.respostas);
  if (entries.length === 0) {
    return [
      "Este documento ainda não possui respostas preenchidas. Clique em “Editar respostas” para começar.",
    ];
  }
  return entries.map(([key, value]) => `${labelify(key)}: ${value}`);
}

function labelify(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink/55">{label}</dt>
      <dd className="text-ink font-medium text-right">{value}</dd>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--blue-royal)] focus-visible:ring-offset-[var(--paper)] disabled:opacity-60 disabled:cursor-not-allowed",
        primary
          ? "bg-[var(--blue-royal)] text-white hover:bg-[#1f46a8]"
          : "border border-[var(--border)] text-ink bg-[var(--surface)] hover:bg-[var(--blue-soft)] hover:border-[var(--blue-royal)]/40",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

function DeleteAction({
  docNome,
  onConfirm,
  loading,
  disabled,
}: {
  docNome: string;
  onConfirm: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--coral)] hover:bg-[var(--coral)]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash className="w-4 h-4" aria-hidden="true" />
          )}
          {loading ? "Excluindo..." : "Excluir"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. O documento &ldquo;{docNome}&rdquo;
            e seu histórico serão removidos permanentemente da sua conta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-[var(--coral)] text-white hover:bg-[var(--coral-hover)]"
          >
            Sim, excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function A4Preview({
  docId,
  titulo,
  paragraphs,
}: {
  docId: string;
  titulo: string;
  paragraphs: string[];
}) {
  return (
    <div
      data-doc-id={docId}
      className="relative w-full max-w-[420px] aspect-[1/1.414] bg-white rounded-sm shadow-[0_18px_44px_-20px_rgba(14,35,64,0.35),0_2px_8px_-4px_rgba(14,35,64,0.18)] overflow-hidden ring-1 ring-black/5"
    >
      <Selo variant="watermark" />

      <div className="relative h-full px-7 sm:px-9 py-8 sm:py-10 text-ink overflow-hidden">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-ink/45">
          DocFacil · ID {docId}
        </p>
        <h3 className="mt-3 font-[family-name:var(--font-jakarta)] text-base sm:text-lg font-extrabold tracking-tight text-center uppercase">
          {titulo}
        </h3>
        <div className="mt-2 mx-auto w-12 h-px bg-ink/20" />

        <div className="mt-5 space-y-3 text-[11px] sm:text-[13px] leading-relaxed text-ink/85">
          {paragraphs.slice(0, 8).map((p, i) => (
            <p key={i} className="text-justify">
              {p}
            </p>
          ))}
          {paragraphs.length > 8 && (
            <p className="text-center text-ink/40 italic">
              ... (mais {paragraphs.length - 8} parágrafo
              {paragraphs.length - 8 !== 1 ? "s" : ""})
            </p>
          )}
        </div>

        {/* Signature lines */}
        <div className="absolute left-7 right-7 sm:left-9 sm:right-9 bottom-8 sm:bottom-10 grid grid-cols-2 gap-6">
          <SignatureBlock label="PARTE 1" />
          <SignatureBlock label="PARTE 2" />
        </div>
      </div>
    </div>
  );
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <div className="text-center">
      <div className="border-t border-ink/40" />
      <p className="mt-1.5 text-[9px] sm:text-[10px] uppercase tracking-wider text-ink/55">
        {label}
      </p>
    </div>
  );
}

function DetalheSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12" aria-hidden="true">
      <div className="order-2 lg:order-1">
        <div className="h-4 bg-[var(--blue-soft)]/50 rounded w-32 animate-pulse mb-3" />
        <div className="aspect-[1/1.414] max-w-[420px] mx-auto rounded-sm bg-[var(--blue-soft)]/25 animate-pulse" />
      </div>
      <div className="order-1 lg:order-2 space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-3 bg-[var(--blue-soft)]/50 rounded w-16" />
          <div className="h-7 bg-[var(--blue-soft)]/50 rounded w-3/4" />
        </div>
        <div className="h-32 rounded-2xl bg-[var(--blue-soft)]/25" />
        <div className="space-y-2.5">
          <div className="h-11 rounded-xl bg-[var(--blue-soft)]/30" />
          <div className="h-11 rounded-xl bg-[var(--blue-soft)]/30" />
          <div className="h-11 rounded-xl bg-[var(--blue-soft)]/30" />
        </div>
      </div>
    </div>
  );
}
