"use client";

import { useRef, useState } from "react";
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
} from "lucide-react";

import { PageShell } from "@/components/docfacil/views/page-shell";
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

gsap.registerPlugin(useGSAP);

const PREVIEW_TEXT = [
  "Pelo presente instrumento particular, MARIA APARECIDA DA SILVA, doravante denominado(a) LOCADOR(A), loca para JOÃO PEREIRA SANTOS, doravante LOCATÁRIO(A), o imóvel situado na Rua das Acácias, 145 — Centro, São Paulo/SP.",
  "A locação tem prazo de 30 (trinta) meses, com início na data da assinatura, e valor mensal de R$ 1.450,00.",
  "O LOCATÁRIO obriga-se a pagar o aluguel até o dia 5 de cada mês, sob pena de multa de 10% (dez por cento).",
];

const HISTORICO = [
  { acao: "Documento criado a partir do modelo Contrato de Locação", quando: "13 de julho de 2026 · 14:22" },
  { acao: "PDF sem marca d'água baixado", quando: "13 de julho de 2026 · 15:08" },
];

export function DocumentoDetalheView() {
  const { params, navigate } = useNav();
  const root = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false);
  const docId = params.id ?? "doc-1";

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
    { scope: root }
  );

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
              <A4Preview docId={docId} />
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
                Contrato de Locação
              </h1>
            </div>

            {/* Metadata card */}
            <section
              aria-label="Informações do documento"
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <dl className="space-y-3 text-sm">
                <MetaRow label="Criado em" value="13 de julho de 2026" />
                <MetaRow label="Última edição" value="há 2 dias" />
                <div className="flex items-center justify-between gap-3 pt-1">
                  <dt className="text-ink/55">Status</dt>
                  <dd>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-tint)] text-[var(--selo-green)] px-2.5 py-1 text-xs font-semibold">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[var(--selo-green)]"
                        aria-hidden="true"
                      />
                      Concluído
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
                  navigate("criar", { slug: "contrato-locacao" })
                }
              />
              <ActionButton
                icon={<Download className="w-4 h-4" aria-hidden="true" />}
                label="Baixar PDF"
                onClick={() => undefined}
              />
              <ActionButton
                icon={<Copy className="w-4 h-4" aria-hidden="true" />}
                label="Duplicar"
                onClick={() => undefined}
              />

              <DeleteAction onConfirm={() => navigate("dashboard")} />
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
                {HISTORICO.map((h, i) => (
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--blue-royal)] focus-visible:ring-offset-[var(--paper)]",
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

function DeleteAction({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--coral)] hover:bg-[var(--coral)]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)]"
        >
          <Trash className="w-4 h-4" aria-hidden="true" />
          Excluir
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. O documento &ldquo;Contrato de
            Locação&rdquo; e seu histórico serão removidos permanentemente da
            sua conta.
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

function A4Preview({ docId }: { docId: string }) {
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
        <h3 className="mt-3 font-[family-name:var(--font-jakarta)] text-base sm:text-lg font-extrabold tracking-tight text-center">
          CONTRATO DE LOCAÇÃO
        </h3>
        <div className="mt-2 mx-auto w-12 h-px bg-ink/20" />

        <div className="mt-5 space-y-3 text-[11px] sm:text-[13px] leading-relaxed text-ink/85">
          {PREVIEW_TEXT.map((p, i) => (
            <p key={i} className="text-justify">
              {p}
            </p>
          ))}
        </div>

        {/* Signature lines */}
        <div className="absolute left-7 right-7 sm:left-9 sm:right-9 bottom-8 sm:bottom-10 grid grid-cols-2 gap-6">
          <SignatureBlock label="LOCADOR(A)" />
          <SignatureBlock label="LOCATÁRIO(A)" />
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
