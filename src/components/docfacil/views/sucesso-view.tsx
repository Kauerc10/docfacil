"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, Check, Copy, Download, Loader2, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Selo } from "../selo";
import { Pet } from "../pet";
import { Confetti } from "../confetti";
import { PaymentBarrier } from "../payment-barrier";
import { useNav } from "../nav-context";
import { PdfDocumentPreview } from "../pdf-document-preview";
import { useAuth } from "@/lib/auth-context";
import { getModel } from "@/lib/services/models-service";
import { getDocument } from "@/lib/services/documents-service";
import {
  finalizeDocument,
  loadGuestDraft,
  clearGuestDraft,
  clearFinalizationRequestId,
  getDocumentApi,
  getDocumentDownloadUrl,
  shareDocument,
} from "@/lib/documents/client";
import { buildGuestFinalizationAnswers } from "@/lib/documents/guest-draft";
import { gerarEBaixarPDF, preloadPdfmake } from "@/lib/pdf/generator";
import { logger } from "@/lib/logger";
import { shouldWatermark } from "@/lib/services/plan-service";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "@/lib/constants";
import type { Modelo } from "@/lib/types";
import { PageShell, PageHeader } from "./page-shell";

gsap.registerPlugin(useGSAP);

export function SucessoView() {
  const { params, navigate } = useNav();
  const slug = params.slug ?? "";
  const docId = params.id;
  const { user } = useAuth();

  const root = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [finalizingPaidOrder, setFinalizingPaidOrder] = useState(false);

  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [clausulasSelecionadas, setClausulasSelecionadas] = useState<string[]>([]);
  const [extrasPorClausula, setExtrasPorClausula] = useState<Record<string, Record<string, string>>>({});
  const [documentWatermarked, setDocumentWatermarked] = useState(false);
  const [loading, setLoading] = useState(true);

  const orderId = params.orderId;

  useEffect(() => {
    async function processPaidOrder() {
      if (orderId && slug && !finalizingPaidOrder) {
        const draft = loadGuestDraft(slug);
        if (!draft) return;

        setFinalizingPaidOrder(true);
        try {
          const result = await finalizeDocument({
            requestId: draft.requestId,
            modeloSlug: draft.modeloSlug || slug,
            respostas: buildGuestFinalizationAnswers(draft),
            clausulasSelecionadas: draft.clausulasSelecionadas,
            guestContact: user ? undefined : draft.guestContact,
            orderId,
          });

          clearGuestDraft(slug);
          clearFinalizationRequestId(slug);

          if (user) {
            setFinalizingPaidOrder(false);
            navigate("sucesso", { slug, id: result.document.id });
            return;
          }

          if (!result.document?.guestAccessPath) {
            throw new Error("Magic link guest ausente após finalização.");
          }

          if (typeof window !== "undefined") {
            window.location.assign(result.document.guestAccessPath);
          }
        } catch (err) {
          logger.error("SucessoView", "falha na finalizacao do pedido pago", err);
          toast.error("Ocorreu uma instabilidade ao gerar seu documento pago. Tente novamente.");
          setFinalizingPaidOrder(false);
        }
      }
    }

    processPaidOrder();
  }, [user, orderId, slug, finalizingPaidOrder, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await getModel(slug);
      setModelo(m);

      if (m && docId) {
        if (docId.startsWith("demo-")) {
          const doc = await getDocument(docId);
          if (doc) setRespostas(doc.respostas);
        } else {
          const doc = await getDocumentApi(docId);
          if (doc) {
            setRespostas(doc.respostas);
            setClausulasSelecionadas(doc.clausulasSelecionadas ?? []);
            setExtrasPorClausula(doc.extrasPorClausula ?? {});
            setDocumentWatermarked(doc.watermarked);
          }
        }
      }
    } catch (e) {
      logger.error("SucessoView", "falha ao carregar", e, { slug, docId });
      setModelo(null);
    } finally {
      setLoading(false);
    }
  }, [slug, docId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    preloadPdfmake().catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  useGSAP(
    () => {
      if (!root.current || !modelo) return;

      const sheet = root.current.querySelector<HTMLElement>("[data-suc='sheet']");
      const cta = root.current.querySelector<HTMLElement>("[data-suc='cta']");
      const secondary = root.current.querySelectorAll<HTMLElement>("[data-suc='secondary']");
      const upsell = root.current.querySelector<HTMLElement>("[data-suc='upsell']");

      if (!sheet || !cta) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      const tl = gsap.timeline();
      tl.from(sheet, { y: 18, opacity: 0, scale: 0.985, duration: 0.45, ease: "power3.out" })
        .from(cta, { y: 14, opacity: 0, duration: 0.4 }, "-=0.18");

      if (secondary.length > 0) {
        tl.from(
          secondary,
          { y: 8, opacity: 0, duration: 0.32, stagger: 0.07 },
          "-=0.22"
        );
      }

      if (upsell) {
        tl.from(upsell, { y: 8, opacity: 0, duration: 0.32 }, "-=0.16");
      }
    },
    { dependencies: [modelo] }
  );

  const handleBaixarPDF = async () => {
    if (!modelo || gerandoPdf) return;
    setGerandoPdf(true);
    try {
      if (docId && !docId.startsWith("demo-")) {
        const { downloadUrl } = await getDocumentDownloadUrl(docId);
        window.location.href = downloadUrl;
      } else {
        await gerarEBaixarPDF(modelo, respostas, modelo.slug, {
          watermark: shouldWatermark(user),
        });
      }
      toast.success(SUCCESS_MESSAGES.PDF_GENERATED, {
        description: `Seu ${modelo.nome} foi baixado.`,
      });
    } catch (e) {
      logger.error("SucessoView", "falha ao gerar PDF", e, { slug });
      toast.error(ERROR_MESSAGES.PDF_FAILED, {
        description: "Tente novamente em alguns segundos.",
      });
    } finally {
      setGerandoPdf(false);
    }
  };

  const ensureShareUrl = async (): Promise<string | null> => {
    if (!docId || docId.startsWith("demo-")) {
      return window.location.href;
    }
    try {
      const res = await shareDocument(docId);
      return `${window.location.origin}${res.shareUrl}`;
    } catch (e) {
      logger.error("SucessoView", "falha ao criar share link seguro", e, { docId });
      toast.error("Não foi possível gerar o link seguro.");
      return null;
    }
  };

  const handleCopyLink = async () => {
    const url = await ensureShareUrl();
    if (!url) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success("Link seguro copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleShareWhatsApp = async () => {
    const url = await ensureShareUrl();
    if (!url) return;
    const text = encodeURIComponent(`Acesse o documento compartilhado no DocFácil: ${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleShareEmail = async () => {
    const url = await ensureShareUrl();
    if (!url) return;
    const subject = encodeURIComponent(`Documento: ${modelo?.nome || "DocFácil"}`);
    const body = encodeURIComponent(`Olá,\n\nVocê pode acessar o documento pelo link seguro:\n${url}\n\nDocFácil`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  if (finalizingPaidOrder) {
    return (
      <PageShell className="bg-[var(--green-tint)]/40 min-h-screen">
        <div className="grid place-items-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <Loader2 className="w-10 h-10 text-[var(--coral)] animate-spin mx-auto" />
            <h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-2xl font-bold text-ink">
              Gerando seu documento seguro…
            </h2>
            <p className="mt-2 text-sm text-ink/70">
              Estamos finalizando seu PDF e preparando seu acesso.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell className="bg-[var(--green-tint)]/40 min-h-screen">
        <div
          className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14"
          role="status"
          aria-busy="true"
          aria-label="Carregando documento"
        >
          <div className="text-center max-w-2xl mx-auto animate-pulse">
            <div className="h-4 w-32 mx-auto rounded-full bg-[var(--blue-soft)]/60" />
            <div className="mt-2 h-9 w-3/4 mx-auto rounded-md bg-[var(--blue-soft)]/60" />
          </div>
          <div className="relative mt-10 mx-auto max-w-md animate-pulse">
            <div className="bg-surface rounded-3xl border border-[var(--border)] shadow-[0_30px_60px_-30px_rgba(14,35,64,0.2)] p-6 sm:p-8">
              <div className="mx-auto w-full max-w-[300px] aspect-[1/1.414] bg-[var(--blue-soft)]/40 rounded-sm" />
            </div>
          </div>
          <div className="mt-8 text-center animate-pulse">
            <div className="h-14 w-56 mx-auto rounded-2xl bg-[var(--coral)]/30" />
          </div>
        </div>
      </PageShell>
    );
  }

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
              Não conseguimos localizar esse documento. Que tal explorar o catálogo?
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

  const previewWatermark = docId && !docId.startsWith("demo-")
    ? documentWatermarked
    : shouldWatermark(user);

  return (
    <PageShell className="bg-[var(--green-tint)]/40 min-h-screen">
      {showConfetti && <Confetti duration={3000} />}

      <div ref={root} className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
        <PageHeader
          eyebrow="Documento pronto"
          title={`Pronto! Seu ${modelo.nome} está formatado e pronto para baixar e assinar.`}
          align="center"
        />

        <div data-suc="stage" className="relative mt-10 mx-auto max-w-md">
          <div
            data-suc="sheet"
            className="relative rounded-3xl border border-[var(--border)] bg-surface p-4 sm:p-5 shadow-[0_30px_60px_-30px_rgba(14,35,64,0.3)]"
          >
            <PdfDocumentPreview
              modelo={modelo}
              respostas={respostas}
              clausulasSelecionadas={clausulasSelecionadas}
              extrasPorClausula={extrasPorClausula}
              watermark={previewWatermark}
              className="mx-auto max-w-[330px]"
            />
          </div>
        </div>

        {user ? (
          <div className="mt-8 text-center">
            <button
              data-suc="cta"
              type="button"
              onClick={handleBaixarPDF}
              disabled={gerandoPdf}
              aria-busy={gerandoPdf}
              className="coral-pulse inline-flex items-center justify-center gap-2.5 h-14 w-full sm:w-auto sm:px-10 rounded-2xl bg-[var(--coral)] text-white font-bold text-lg hover:bg-[var(--coral-hover)] active:scale-[0.99] transition-colors disabled:opacity-80 disabled:cursor-not-allowed"
            >
              {gerandoPdf ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando PDF…
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Baixar Documento (PDF)
                </>
              )}
            </button>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                data-suc="secondary"
                type="button"
                onClick={handleShareWhatsApp}
                aria-label="Compartilhar no WhatsApp"
                className="grid place-items-center w-11 h-11 rounded-full border border-[var(--border)] text-ink/70 hover:bg-[var(--blue-soft)] hover:text-[var(--blue-royal)] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              <button
                data-suc="secondary"
                type="button"
                onClick={handleShareEmail}
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
                onClick={() => navigate("planos")}
                className="text-[var(--blue-royal)] font-semibold hover:underline"
              >
                Conheça o plano Pro
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
        ) : (
          <div className="mt-8">
            <PaymentBarrier
              documentoNome={modelo.nome}
              slug={modelo.slug}
              docId={docId}
              onLogin={() => navigate("login")}
            />

            <div className="mt-8 flex flex-col items-center text-center gap-3">
              <Pet mood="atencao" size={64} />
              <p className="text-sm text-ink/60 max-w-sm">
                Você preencheu tudo certinho. Para baixar o PDF sem marca d&apos;água,
                faça o pagamento único ou entre na sua conta.
              </p>
              <button
                type="button"
                onClick={() => navigate("home")}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink/55 hover:text-[var(--blue-royal)] font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao início
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
