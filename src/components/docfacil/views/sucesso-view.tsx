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
import { useAuth } from "@/lib/auth-context";
import { getModel } from "@/lib/services/models-service";
import { getDocument } from "@/lib/services/documents-service";
import {
  finalizeDocument,
  loadGuestDraft,
  clearGuestDraft,
  clearFinalizationRequestId,
  getDocumentDownloadUrl,
  shareDocument,
} from "@/lib/documents/client";
import { gerarEBaixarPDF, preloadPdfmake } from "@/lib/pdf/generator";
import { logger } from "@/lib/logger";
import { shouldWatermark } from "@/lib/services/plan-service";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "@/lib/constants";
import type { Modelo } from "@/lib/types";
import { PageShell, PageHeader } from "./page-shell";

gsap.registerPlugin(useGSAP);

/**
 * SucessoView — the standalone success / download screen, shown right after
 * the user finishes a document in CriarView. This is the brand climax:
 * the green DOCFACIL stamp "strikes" the A4 sheet (scale overshoot + small
 * yoyo shake), then the single coral CTA breathes in. Confetti fires on
 * mount (3s).
 *
 * Auth-aware CTA:
 *  - !user (deslogado) → PaymentBarrier (R$ 9,90 avulso ou login) em vez do
 *    botão direto de download. O usuário só baixa o PDF após pagar ou entrar.
 *  - user (logado)    → botão coral "Baixar Documento (PDF)" direto +
 *    share icons + upsell "Crie uma conta Pro" (se grátis).
 *
 * Wiring:
 *  - Modelo vem de `getModel(slug)` (Firestore/local via services).
 *  - `params.id` (passado pela CriarView) carrega o documento salvo via
 *    `getDocument(id)`, pra mostrar as respostas reais na prévia A4.
 *  - O botão coral chama `gerarEBaixarPDF(modelo, respostas, slug)` de
 *    verdade (pdfmake carregado dinamicamente na primeira chamada).
 */
export function SucessoView() {
  const { params, navigate } = useNav();
  const slug = params.slug ?? "";
  const docId = params.id;
  const { user } = useAuth();

  const root = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [finalizingGuest, setFinalizingGuest] = useState(false);

  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const orderId = params.orderId;

  useEffect(() => {
    async function processGuestOrder() {
      if (!user && orderId && slug && !finalizingGuest) {
        const draft = loadGuestDraft(slug);
        if (!draft) return;

        setFinalizingGuest(true);
        try {
          const result = await finalizeDocument({
            requestId: draft.requestId,
            modeloSlug: draft.modeloSlug || slug,
            respostas: draft.answers,
            clausulasSelecionadas: draft.clausulasSelecionadas,
            guestContact: draft.guestContact,
            orderId,
          });

          if (result.document?.guestAccessPath) {
            clearGuestDraft(slug);
            clearFinalizationRequestId(slug);
            if (typeof window !== "undefined") {
              window.location.assign(result.document.guestAccessPath);
            }
          }
        } catch (err) {
          logger.error("SucessoView", "falha na finalizacao do pedido guest", err);
          toast.error("Ocorreu uma instabilidade ao gerar seu documento pago. Tente novamente.");
          setFinalizingGuest(false);
        }
      }
    }

    processGuestOrder();
  }, [user, orderId, slug, finalizingGuest]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await getModel(slug);
      setModelo(m);
      // Se a CriarView passou um id, tentamos carregar as respostas reais.
      if (m && docId) {
        const doc = await getDocument(docId);
        if (doc) setRespostas(doc.respostas);
      }
      // Se não há doc (ex.: veio do SuccessShowcase demo da home), segue
      // com respostas vazias — a prévia mostra ____________, como antes.
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

  // Pré-aquece o pdfmake (lazy load do vfs) assim que a tela aparece, pra
  // o clique no botão coral ser instantâneo na maioria dos casos.
  useEffect(() => {
    preloadPdfmake().catch(() => {
      /* silent — o botão ainda vai funcionar, só será mais lento na 1ª vez */
    });
  }, []);

  // Confetti: some após 3s (também some automaticamente via Confetti internals,
  // mas garantimos o unmount pra liberar os 40 elementos do DOM).
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Stamp strike — fires on mount (no ScrollTrigger needed, user just landed).
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || !modelo) {
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
    { scope: root, dependencies: [modelo] }
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

  // --- Loading skeleton ---
  if (finalizingGuest) {
    return (
      <PageShell className="bg-[var(--green-tint)]/40 min-h-screen">
        <div className="grid place-items-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <Loader2 className="w-10 h-10 text-[var(--coral)] animate-spin mx-auto" />
            <h2 className="mt-4 font-[family-name:var(--font-jakarta)] text-2xl font-bold text-ink">
              Gerando seu documento seguro…
            </h2>
            <p className="mt-2 text-sm text-ink/70">
              Estamos finalizando seu PDF e preparando seu link de acesso permanente.
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
              <div className="mx-auto w-full max-w-[280px] aspect-[1/1.414] bg-[var(--blue-soft)]/40 rounded-sm" />
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

  return (
    <PageShell className="bg-[var(--green-tint)]/40 min-h-screen">
      {showConfetti && <Confetti duration={3000} />}

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
                      {renderFilledLine(line, respostas)}
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

        {/* CTA + share + upsell — auth-aware branching */}
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

            {/* Mascote + reassurance abaixo da barreira */}
            <div className="mt-8 flex flex-col items-center text-center gap-3">
              <Pet mood="atencao" size={64} />
              <p className="text-sm text-ink/60 max-w-sm">
                Você preencheu tudo certinho. Para baixar o PDF sem marca
                d&apos;água, faça o pagamento único ou entre na sua conta.
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

/**
 * Substitui `{{key}}` por:
 *  - o valor real preenchido (destacado em ink/semibold), se existir;
 *  - `____________` caso contrário (mesma aparência de antes do wiring).
 *
 * Espelha a função `fillTemplate` do generator, mas como JSX pra poder
 * estilizar as partes preenchidas (e mantém o contraste com o cinza do
 * placeholder no thumbnail A4).
 */
function renderFilledLine(
  line: string,
  respostas: Record<string, string>
): React.ReactNode {
  const parts = line.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    const m = part.match(/^\{\{([^}]+)\}\}$/);
    if (m) {
      const key = m[1];
      const v = respostas[key];
      if (v && v.trim()) {
        return (
          <span key={`${key}-${i}`} className="font-semibold text-ink">
            {v}
          </span>
        );
      }
      return (
        <span key={`${key}-${i}`} className="text-ink/45">
          ____________
        </span>
      );
    }
    return <span key={`t-${i}`}>{part}</span>;
  });
}
