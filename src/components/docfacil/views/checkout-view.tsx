"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Lock,
  LogIn,
  QrCode,
  ShieldCheck,
  Ban,
  RotateCcw,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useNav } from "@/components/docfacil/nav-context";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/docfacil/logo";
import {
  PLAN_PRICES,
  PLAN_LABELS,
  ACTIVE_PROVIDER,
  createCheckout,
  checkOrderStatus,
  type CheckoutPlan,
  type CheckoutMethod,
  type CheckoutStatusResult,
} from "@/lib/services/checkout-service";
import { TermsConsentModal } from "@/components/docfacil/terms-consent-modal";
import {
  loadGuestDraft,
  saveGuestDraft,
  getAccountDraft,
  deleteAccountDraft,
  createDocumentVersion,
  clearFinalizationRequestId,
} from "@/lib/documents/client";
import { finalizeClientDraft } from "@/lib/documents/client-document";

function getStoredGuestContact(
  orderId?: string,
  slug?: string
): { email?: string; phone?: string } | undefined {
  if (typeof window === "undefined") return undefined;
  const keys = [
    orderId ? `docfacil:guest_contact:${orderId}` : null,
    slug ? `docfacil:guest_contact:${slug}` : null,
    "docfacil:last_guest_contact",
  ].filter(Boolean) as string[];

  for (const key of keys) {
    try {
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email || parsed?.phone) return parsed;
      }
    } catch {
      // continue
    }
  }

  if (slug) {
    const draft = loadGuestDraft(slug);
    if (draft?.guestContact?.email || draft?.guestContact?.phone) {
      return draft.guestContact;
    }
  }

  return undefined;
}

function persistGuestContact(
  contact: { email?: string; phone?: string },
  orderId?: string,
  slug?: string
) {
  if (typeof window === "undefined") return;
  try {
    const data = JSON.stringify(contact);
    sessionStorage.setItem("docfacil:last_guest_contact", data);
    localStorage.setItem("docfacil:last_guest_contact", data);
    if (slug) {
      sessionStorage.setItem(`docfacil:guest_contact:${slug}`, data);
      localStorage.setItem(`docfacil:guest_contact:${slug}`, data);
    }
    if (orderId) {
      sessionStorage.setItem(`docfacil:guest_contact:${orderId}`, data);
      localStorage.setItem(`docfacil:guest_contact:${orderId}`, data);
    }
  } catch {
    // ignore
  }
}

export function CheckoutView() {
  const { params, navigate } = useNav();
  const { user, loading, refreshProfile } = useAuth();

  const planParam = (params.plan as CheckoutPlan | undefined) ?? "avulso";
  const plan: CheckoutPlan = planParam === "pro" ? "pro" : "avulso";
  const price = PLAN_PRICES[plan];
  const label = PLAN_LABELS[plan];

  const [consentOpen, setConsentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [method, setMethod] = useState<CheckoutMethod>("pix");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [needsManualRetry, setNeedsManualRetry] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const handledPaidOrderId = useRef<string | null>(null);

  const userId = user?.uid ?? "guest";
  const userEmail = user?.email ?? guestEmail.trim();

  const continueAfterPaidOrder = useCallback(
    async (status: CheckoutStatusResult) => {
      if (handledPaidOrderId.current === status.orderId) return;
      handledPaidOrderId.current = status.orderId;

      try {
        const slug = params.slug;
        const draftId = params.draftId;

        if (status.status === "consumed") {
          if (!status.documentId || !slug) {
            throw new Error("Pedido consumido sem documento associado.");
          }
          navigate("sucesso", { slug, id: status.documentId });
          return;
        }

        if (status.status !== "paid") return;

        if (status.product === "pro") {
          if (slug) clearFinalizationRequestId(slug);
          await refreshProfile();
          toast.success("Pagamento confirmado. Seu plano Pro está ativo.");

          if (slug && draftId) {
            navigate("criar", { slug, draftId });
          } else {
            navigate("perfil");
          }
          return;
        }

        if (user && draftId) {
          const draft = await getAccountDraft(draftId);
          if (!draft) {
            throw new Error("O rascunho associado ao checkout não foi encontrado.");
          }

          const isNovaVersao = Boolean(draft.sourceDocumentId);
          const finalized = await finalizeClientDraft({
            draft: {
              id: draft.id,
              modeloSlug: draft.modeloSlug,
              sourceDocumentId: draft.sourceDocumentId,
              respostas: draft.respostas,
              stepIndex: draft.stepIndex,
              clausulasSelecionadas: draft.clausulasSelecionadas,
              extrasPorClausula: draft.extrasPorClausula,
            },
            orderId: status.orderId,
            versionCreator: draft.sourceDocumentId
              ? (id, p) =>
                  createDocumentVersion(draft.sourceDocumentId!, {
                    ...p,
                    orderId: status.orderId,
                  })
              : undefined,
            user,
          });

          await deleteAccountDraft(draft.id);
          toast.success(
            isNovaVersao
              ? "Pagamento confirmado e nova versão liberada."
              : "Pagamento confirmado e documento liberado."
          );
          navigate("sucesso", {
            slug: draft.modeloSlug,
            id: finalized.document.id,
          });
          return;
        }

        if (slug) {
          navigate("sucesso", { slug, orderId: status.orderId });
          return;
        }

        throw new Error("Não foi possível retomar o documento deste pagamento.");
      } catch (error) {
        handledPaidOrderId.current = null;
        throw error;
      }
    },
    [navigate, params.draftId, params.slug, refreshProfile, user]
  );

  const returnOrderId = params.billingReturn === "1" ? params.orderId : undefined;

  useEffect(() => {
    if (!returnOrderId || loading) return;

    let cancelled = false;
    setVerifyingPayment(true);
    setNeedsManualRetry(false);

    if (!user) {
      const stored = getStoredGuestContact(returnOrderId, params.slug);
      if (stored?.email && !guestEmail) {
        setGuestEmail(stored.email);
      }
    }

    const verify = async () => {
      const maxAttempts = 5;
      const delayMs = 2000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (cancelled) return;

        try {
          const effectiveContact = !user
            ? getStoredGuestContact(returnOrderId, params.slug)
            : undefined;

          const effectiveEmail = userEmail || effectiveContact?.email;
          const effectivePhone = effectiveContact?.phone;

          const status = await checkOrderStatus({
            orderId: returnOrderId,
            authenticated: Boolean(user),
            email: effectiveEmail || undefined,
            phone: effectivePhone || undefined,
          });

          if (cancelled) return;

          if (status.status === "paid" || status.status === "consumed") {
            setVerifyingPayment(false);
            await continueAfterPaidOrder(status);
            return;
          }

          if (attempt === 1) {
            toast.info("Aguardando confirmação do pagamento pelo Mercado Pago…");
          }

          if (attempt < maxAttempts) {
            await new Promise((res) => setTimeout(res, delayMs));
          }
        } catch (err) {
          if (attempt === maxAttempts) {
            if (!cancelled) {
              console.error("[CheckoutView] falha ao verificar retorno de billing:", err);
            }
          } else {
            await new Promise((res) => setTimeout(res, delayMs));
          }
        }
      }

      if (!cancelled) {
        setVerifyingPayment(false);
        setNeedsManualRetry(true);
        toast.info(
          "Pagamento ainda em processamento. Se você já concluiu no Mercado Pago, clique em 'Verificar novamente'."
        );
      }
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, [returnOrderId, loading, user, userEmail, continueAfterPaidOrder, retryCount]);

  const handleAcceptConsent = useCallback(async () => {
    setConsentOpen(false);
    setSubmitting(true);
    try {
      const slug = params.slug;
      const draftId = params.draftId;

      if (slug && !user && guestEmail.trim()) {
        persistGuestContact({ email: guestEmail.trim() }, undefined, slug);
        const draft = loadGuestDraft(slug);
        if (draft) {
          saveGuestDraft(slug, {
            ...draft,
            guestContact: { email: guestEmail.trim() },
          });
        }
      }

      let successUrl: string | undefined;
      if (typeof window !== "undefined") {
        const success = new URL(window.location.origin);
        success.searchParams.set("view", "checkout");
        if (plan) success.searchParams.set("plan", plan);
        if (slug) success.searchParams.set("slug", slug);
        if (draftId) success.searchParams.set("draftId", draftId);
        successUrl = success.toString();
      }

      const result = await createCheckout({
        plan,
        userId,
        userEmail,
        method,
        documentId: params.docId,
        successUrl,
      });

      if (!user && guestEmail.trim() && result.orderId) {
        persistGuestContact({ email: guestEmail.trim() }, result.orderId, slug);
      }

      if (result.kind === "pix") {
        setSubmitting(false);
        toast.success("Código Pix gerado com sucesso.");
        return;
      }

      if (result.provider === "demo" && plan === "pro") {
        if (slug) clearFinalizationRequestId(slug);
        await refreshProfile();
        toast.success("Plano Pro ativado no modo demonstração.", {
          description: "Sua conta já está com documentos ilimitados para os testes.",
        });
        setSubmitting(false);

        if (slug && draftId) {
          navigate("criar", { slug, draftId });
        } else {
          navigate("perfil");
        }
        return;
      }

      if (result.provider === "demo" && plan === "avulso") {
        if (user && draftId) {
          const draft = await getAccountDraft(draftId);
          if (!draft) {
            throw new Error("O rascunho associado ao checkout não foi encontrado.");
          }

          const isNovaVersao = Boolean(draft.sourceDocumentId);
          const finalized = await finalizeClientDraft({
            draft: {
              id: draft.id,
              modeloSlug: draft.modeloSlug,
              sourceDocumentId: draft.sourceDocumentId,
              respostas: draft.respostas,
              stepIndex: draft.stepIndex,
              clausulasSelecionadas: draft.clausulasSelecionadas,
              extrasPorClausula: draft.extrasPorClausula,
            },
            orderId: result.orderId,
            versionCreator: draft.sourceDocumentId
              ? (id, p) =>
                  createDocumentVersion(draft.sourceDocumentId!, {
                    ...p,
                    orderId: result.orderId,
                  })
              : undefined,
            user,
          });

          await deleteAccountDraft(draft.id);

          toast.success(
            isNovaVersao
              ? "Pagamento demo aprovado e nova versão liberada."
              : "Pagamento demo aprovado e documento liberado."
          );
          setSubmitting(false);
          navigate("sucesso", {
            slug: draft.modeloSlug,
            id: finalized.document.id,
          });
          return;
        }

        if (slug) {
          setSubmitting(false);
          navigate("sucesso", {
            slug,
            orderId: result.orderId,
          });
          return;
        }
      }

      toast.success(
        result.provider === "demo"
          ? "Pagamento demo aprovado. Finalizando seu documento…"
          : "Redirecionando para o pagamento seguro…"
      );
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = result.checkoutUrl;
        }
      }, 600);
    } catch (e) {
      console.error("[CheckoutView] falha ao criar checkout:", e);
      toast.error("Não foi possível concluir o pagamento. Seu preenchimento continua salvo.");
      setSubmitting(false);
    }
  }, [
    plan,
    userId,
    userEmail,
    method,
    params.docId,
    params.slug,
    params.draftId,
    user,
    guestEmail,
    refreshProfile,
    navigate,
  ]);

  if (plan === "pro" && loading) return <CheckoutSkeleton />;
  if (plan === "pro" && !user) return <ProLoginPrompt />;

  function formatBRL(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function handlePayClick() {
    if (plan === "avulso" && !user && !guestEmail.trim()) {
      toast.error("Informe seu e-mail para continuar.");
      return;
    }

    const requiresCheckoutConsent = !user && plan === "avulso";
    if (!requiresCheckoutConsent) {
      void handleAcceptConsent();
      return;
    }

    setConsentOpen(true);
  }

  const isAvulso = plan === "avulso";
  const ctaText = submitting
    ? plan === "pro" && ACTIVE_PROVIDER === "demo"
      ? "Ativando Pro…"
      : "Processando…"
    : `Pagar ${formatBRL(price)}`;

  return (
    <section className="pt-[72px] pb-16 min-h-[calc(100vh-72px)] bg-paper">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button
          onClick={() => navigate("planos")}
          className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Voltar aos planos
        </button>

        <div className="flex items-center justify-center mb-6">
          <Logo variant="header" />
        </div>

        <div className="text-center mb-8">
          <p className="text-[var(--selo-green)] font-semibold text-sm uppercase tracking-wider">
            Checkout seguro
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl font-extrabold text-ink tracking-tight text-balance">
            {label}
          </h1>
          <p className="mt-2 text-ink/60 text-lg">
            {isAvulso
              ? "Pague uma vez. Baixe o PDF na hora."
              : "Assinatura mensal. Cancele quando quiser."}
          </p>
        </div>

        <div className="bg-surface border border-[var(--border)] rounded-2xl shadow-[0_12px_40px_-12px_rgba(14,35,64,0.16)] overflow-hidden">
          <div className="px-6 sm:px-7 py-5 border-b border-[var(--border)] bg-[var(--blue-soft)]/30">
            <p className="text-xs uppercase tracking-wider text-ink/55 font-semibold">
              Resumo do pedido
            </p>
          </div>

          <div className="px-6 sm:px-7 py-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{label}</p>
                <p className="text-sm text-ink/55 mt-0.5">
                  {isAvulso
                    ? "1 documento · PDF sem marca d'água · download imediato"
                    : "Documentos ilimitados · renovação mensal"}
                </p>
              </div>
              <span className="font-[family-name:var(--font-jakarta)] font-extrabold text-ink text-xl whitespace-nowrap">
                {formatBRL(price)}
              </span>
            </div>

            {isAvulso && !user && (
              <label className="block pt-3 border-t border-[var(--border)]">
                <span className="block text-sm font-semibold text-ink mb-1.5">
                  Seu e-mail (para receber o documento)
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="w-full h-12 px-4 text-base rounded-lg border border-[var(--border)] bg-paper focus:bg-surface outline-none focus:border-[var(--blue-royal)] focus:ring-4 focus:ring-[var(--blue-soft)] transition placeholder:text-ink/35"
                />
              </label>
            )}

            <PaymentMethodSelector
              plan={plan}
              method={method}
              onChange={setMethod}
            />
          </div>

          <div className="px-6 sm:px-7 py-4 border-t border-[var(--border)] bg-[var(--green-tint)]/40">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink/65">Total a pagar</span>
              <span className="font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink">
                {formatBRL(price)}
              </span>
            </div>
          </div>

          <div className="px-6 sm:px-7 py-5">
            {(verifyingPayment || needsManualRetry) && (
              <PaymentVerificationPanel
                verifying={verifyingPayment}
                isPendingRetry={needsManualRetry}
                onRetry={() => setRetryCount((prev) => prev + 1)}
              />
            )}

            <button
              type="button"
              onClick={handlePayClick}
              disabled={submitting || verifyingPayment}
              className="w-full h-13 inline-flex items-center justify-center gap-2.5 rounded-xl bg-[var(--coral)] px-6 py-3.5 text-white font-bold text-base hover:bg-[var(--coral-hover)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--coral)]/30 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  {ctaText}
                </>
              ) : (
                <>
                  {isAvulso && method === "pix" ? (
                    <QrCode className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <CreditCard className="w-5 h-5" aria-hidden="true" />
                  )}
                  {ctaText}
                </>
              )}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink/50">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              {isAvulso
                ? "Pagamento criptografado · Mercado Pago (Pix e Cartão)"
                : "Pagamento criptografado · Mercado Pago (Assinatura Segura)"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TrustBadge
            icon={FileText}
            title="PDF completo"
            desc={isAvulso ? "Sem marca d'água" : "Ilimitado"}
          />
          <TrustBadge
            icon={RotateCcw}
            title="7 dias de garantia"
            desc="Reembolso integral (CDC art. 49)"
          />
          <TrustBadge
            icon={Ban}
            title="Sem pegadinhas"
            desc={isAvulso ? "Pagamento único" : "Cancele quando quiser"}
          />
        </div>

        {ACTIVE_PROVIDER === "demo" && (
          <div className="mt-6 rounded-xl border border-[var(--blue-royal)]/25 bg-[var(--blue-soft)]/40 px-4 py-3 text-sm text-ink/70 flex items-start gap-2.5">
            <ShieldCheck
              className="w-4 h-4 mt-0.5 shrink-0 text-[var(--blue-royal)]"
              aria-hidden="true"
            />
            <span>
              <strong>Modo demonstração:</strong> nenhum pagamento real será processado. {isAvulso
                ? "O pedido será marcado como pago e o documento será liberado para testar o fluxo completo."
                : "Ao confirmar, sua conta será ativada como Pro imediatamente para testar os recursos ilimitados."}
            </span>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-ink/55">
          Ao continuar, você concorda com os{" "}
          <button
            type="button"
            onClick={() => navigate("termos")}
            className="text-[var(--blue-royal)] font-medium hover:underline cursor-pointer"
          >
            Termos de Uso
          </button>{" "}
          e a{" "}
          <button
            type="button"
            onClick={() => navigate("privacidade")}
            className="text-[var(--blue-royal)] font-medium hover:underline cursor-pointer"
          >
            Política de Privacidade
          </button>
          .
        </p>
      </div>

      <TermsConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAccept={handleAcceptConsent}
        flow="checkout"
        userId={userId}
        userEmail={userEmail}
      />
    </section>
  );
}

function PaymentMethodSelector({
  plan,
  method,
  onChange,
}: {
  plan: CheckoutPlan;
  method: CheckoutMethod;
  onChange: (method: CheckoutMethod) => void;
}) {
  if (plan === "pro") {
    return (
      <div className="pt-3 border-t border-[var(--border)]">
        <p className="text-xs uppercase tracking-wider text-ink/50 font-semibold mb-2">
          Forma de pagamento
        </p>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--blue-royal)]/25 bg-[var(--blue-soft)]/35 px-4 py-3">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-surface text-[var(--blue-royal)] shrink-0">
            <CreditCard className="w-4 h-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Cartão de crédito recorrente</p>
            <p className="text-xs text-ink/55 mt-0.5">
              Cobrança mensal de {PLAN_PRICES.pro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} via Mercado Pago.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const methods: Array<{
    id: CheckoutMethod;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "pix",
      title: "Pagar com Pix",
      description: "Código e QR Code imediatos com liberação automática.",
      icon: QrCode,
    },
    {
      id: "card",
      title: "Pagar com cartão",
      description: "Checkout seguro hospedado do Mercado Pago.",
      icon: CreditCard,
    },
  ];

  return (
    <fieldset className="pt-3 border-t border-[var(--border)]">
      <legend className="text-xs uppercase tracking-wider text-ink/50 font-semibold mb-2">
        Como você quer pagar?
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {methods.map((option) => {
          const Icon = option.icon;
          const selected = method === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={`text-left rounded-xl border px-4 py-3 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] cursor-pointer ${
                selected
                  ? "border-[var(--blue-royal)] bg-[var(--blue-soft)]/35"
                  : "border-[var(--border)] bg-paper hover:bg-[var(--blue-soft)]/15"
              }`}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`grid place-items-center w-9 h-9 rounded-full shrink-0 ${
                    selected
                      ? "bg-[var(--blue-royal)] text-white"
                      : "bg-surface text-ink/55"
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    {option.title}
                  </span>
                  <span className="block text-xs text-ink/55 mt-0.5 leading-snug">
                    {option.description}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PaymentVerificationPanel({
  verifying,
  isPendingRetry,
  onRetry,
}: {
  verifying: boolean;
  isPendingRetry?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-[var(--blue-royal)]/20 bg-[var(--blue-soft)]/30 p-4 text-center">
      <span className="mx-auto grid place-items-center w-9 h-9 rounded-full bg-surface text-[var(--blue-royal)]">
        {verifying ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
        )}
      </span>
      <p className="mt-2 font-semibold text-sm text-ink">
        {verifying ? "Confirmando seu pagamento" : "Aguardando confirmação do Mercado Pago"}
      </p>
      <p className="mt-0.5 text-xs text-ink/60">
        {verifying
          ? "Estamos consultando a autorização do pagamento no Mercado Pago…"
          : "O pagamento ainda está sendo processado. Se você já concluiu no Mercado Pago, clique abaixo:"}
      </p>
      {isPendingRetry && !verifying && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[var(--blue-royal)] hover:bg-[var(--navy)] rounded-lg transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Verificar novamente
        </button>
      )}
    </div>
  );
}

function TrustBadge({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-surface px-4 py-3">
      <span className="grid place-items-center w-8 h-8 rounded-full bg-[var(--green-tint)] text-[var(--selo-green)] shrink-0">
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink leading-tight">{title}</p>
        <p className="text-xs text-ink/55 mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="pt-[72px] min-h-[calc(100vh-72px)] bg-paper">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12" aria-hidden="true">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[var(--blue-soft)]/50 rounded w-24" />
          <div className="h-9 bg-[var(--blue-soft)]/50 rounded w-1/2 mx-auto" />
          <div className="h-48 bg-[var(--blue-soft)]/30 rounded-xl mt-6" />
        </div>
      </div>
    </div>
  );
}

function ProLoginPrompt() {
  const { navigate } = useNav();
  return (
    <div className="pt-[72px] min-h-[calc(100vh-72px)] bg-paper">
      <div className="max-w-md mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
        <div
          className="mx-auto w-16 h-16 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)] grid place-items-center"
          aria-hidden="true"
        >
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="mt-5 font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold text-ink tracking-tight text-balance">
          Faça login para assinar o Pro
        </h1>
        <p className="mt-3 text-ink/65 text-base leading-relaxed text-pretty">
          O plano Pro é uma assinatura mensal, então precisamos de uma conta para gerenciar sua assinatura, histórico e documentos ilimitados.
        </p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate("login")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--blue-royal)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--navy)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] cursor-pointer"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => navigate("cadastro")}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-surface px-6 py-3 text-sm font-semibold text-ink hover:bg-paper transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] cursor-pointer"
          >
            Criar conta grátis
          </button>
        </div>
        <p className="mt-6 text-sm text-ink/50">
          Prefere pagar uma única vez?{" "}
          <button
            type="button"
            onClick={() => navigate("checkout", { plan: "avulso" })}
            className="text-[var(--blue-royal)] font-medium hover:underline cursor-pointer"
          >
            Comprar documento avulso
          </button>
        </p>
      </div>
    </div>
  );
}
