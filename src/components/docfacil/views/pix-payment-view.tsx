"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/docfacil/logo";
import { useNav } from "@/components/docfacil/nav-context";
import { useAuth } from "@/lib/auth-context";
import { loadGuestDraft } from "@/lib/documents/client";
import {
  PLAN_PRICES,
  checkOrderStatus,
  type CheckoutPixPayload,
  type CheckoutStatusResult,
} from "@/lib/services/checkout-service";
import {
  buildPixCheckoutReturnUrl,
  parsePixPaymentSession,
  pixPaymentSessionStorageKey,
  shouldPollPixPayment,
  type PixPaymentSession,
  type PixPaymentState,
} from "@/lib/services/pix-payment-session";

const PAYMENT_POLL_INTERVAL_MS = 1500;
const PAYMENT_POLL_MAX_ATTEMPTS = 120;

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeQrSource(value: string): string {
  return value.startsWith("data:image/")
    ? value
    : `data:image/png;base64,${value}`;
}

function formatExpiration(timestamp: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function fallbackReturnUrl(params: Record<string, string | undefined>): string {
  const url = new URL(window.location.origin);
  url.searchParams.set("view", "checkout");
  url.searchParams.set("plan", "avulso");
  if (params.slug) url.searchParams.set("slug", params.slug);
  if (params.draftId) url.searchParams.set("draftId", params.draftId);
  return url.toString();
}

export function PixPaymentView() {
  const { params } = useNav();
  const { user, loading: authLoading } = useAuth();
  const orderId = params.orderId;

  const [session, setSession] = useState<PixPaymentSession | null>(null);
  const [pix, setPix] = useState<CheckoutPixPayload | null>(null);
  const [paymentState, setPaymentState] = useState<PixPaymentState>("loading");
  const [lastStatus, setLastStatus] = useState<CheckoutStatusResult | null>(null);

  useEffect(() => {
    if (!orderId || typeof window === "undefined") return;
    const stored = parsePixPaymentSession(
      window.sessionStorage.getItem(pixPaymentSessionStorageKey(orderId))
    );
    if (stored?.orderId !== orderId) return;

    const hydrateTimer = window.setTimeout(() => {
      setSession(stored);
      setPix(stored.pix);
      setPaymentState(Date.now() >= stored.pix.expiresAt ? "expired" : "pending");
    }, 0);

    return () => window.clearTimeout(hydrateTimer);
  }, [orderId]);

  const guestDraft = useMemo(
    () => (params.slug ? loadGuestDraft(params.slug) : null),
    [params.slug]
  );

  const returnToAuthoritativeCheckout = useCallback(
    (resolvedOrderId: string) => {
      if (typeof window === "undefined") return;
      const returnUrl = session?.returnUrl || fallbackReturnUrl(params);
      const billingReturn = buildPixCheckoutReturnUrl(returnUrl, resolvedOrderId);
      window.location.replace(billingReturn);
    },
    [params, session]
  );

  useEffect(() => {
    if (!orderId || authLoading || !shouldPollPixPayment(paymentState)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;

      try {
        const status = await checkOrderStatus({
          orderId,
          authenticated: Boolean(user),
          email:
            user?.email ??
            session?.guestEmail ??
            guestDraft?.guestContact?.email,
          phone: guestDraft?.guestContact?.phone,
        });

        if (cancelled) return;
        setLastStatus(status);

        if (status.pix) {
          setPix(status.pix);
          setPaymentState(Date.now() >= status.pix.expiresAt ? "expired" : "pending");
        }

        if (status.status === "paid" || status.status === "consumed") {
          setPaymentState("paid");
          window.setTimeout(() => returnToAuthoritativeCheckout(status.orderId), 700);
          return;
        }

        if (status.status === "failed" || status.status === "refunded") {
          setPaymentState("failed");
          return;
        }

        const expiresAt = status.pix?.expiresAt ?? pix?.expiresAt;
        if (expiresAt && Date.now() >= expiresAt) {
          setPaymentState("expired");
          return;
        }

        setPaymentState("pending");
      } catch (error) {
        if (attempts >= PAYMENT_POLL_MAX_ATTEMPTS) {
          console.error("[PixPaymentView] falha ao consultar pagamento:", error);
          setPaymentState("error");
          return;
        }
      }

      if (attempts >= PAYMENT_POLL_MAX_ATTEMPTS) {
        setPaymentState("error");
        return;
      }

      timer = setTimeout(() => void poll(), PAYMENT_POLL_INTERVAL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    authLoading,
    guestDraft?.guestContact?.email,
    guestDraft?.guestContact?.phone,
    orderId,
    paymentState,
    pix?.expiresAt,
    returnToAuthoritativeCheckout,
    session?.guestEmail,
    user,
  ]);

  async function copyPixCode() {
    if (!pix?.brCode) return;
    try {
      await navigator.clipboard.writeText(pix.brCode);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não conseguimos copiar automaticamente. Selecione o código e copie manualmente.");
    }
  }

  function backToCheckout() {
    if (typeof window === "undefined") return;
    const returnUrl = session?.returnUrl || fallbackReturnUrl(params);
    window.location.assign(returnUrl);
  }

  if (!orderId) {
    return (
      <PixStateCard
        title="Pagamento não encontrado"
        description="Volte ao checkout e gere um novo Pix."
        onBack={backToCheckout}
      />
    );
  }

  const qrSource = pix?.brCodeBase64 ? normalizeQrSource(pix.brCodeBase64) : null;
  const amount = lastStatus ? lastStatus.amountCents / 100 : PLAN_PRICES.avulso;

  return (
    <section className="pt-[72px] pb-16 min-h-[calc(100vh-72px)] bg-paper">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
        <button
          type="button"
          onClick={backToCheckout}
          className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Voltar ao checkout
        </button>

        <div className="flex justify-center mb-6">
          <Logo variant="header" />
        </div>

        <div className="text-center mb-7">
          <p className="text-[var(--selo-green)] font-semibold text-sm uppercase tracking-wider">
            Pagamento via Pix
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Escaneie o QR Code e pronto
          </h1>
          <p className="mt-2 text-ink/60">
            A confirmação acontece automaticamente. Mantenha esta página aberta após pagar.
          </p>
        </div>

        <div className="bg-surface border border-[var(--border)] rounded-3xl shadow-[0_18px_50px_-24px_rgba(14,35,64,0.28)] overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-6 sm:px-8 py-5 bg-[var(--blue-soft)]/30 border-b border-[var(--border)]">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink/50 font-semibold">Total a pagar</p>
              <p className="mt-1 text-sm text-ink/60">Documento avulso · pagamento único</p>
            </div>
            <strong className="font-[family-name:var(--font-jakarta)] text-2xl text-ink">
              {formatBRL(amount)}
            </strong>
          </div>

          <div className="px-6 sm:px-8 py-7 sm:py-8">
            {paymentState === "paid" ? (
              <div className="py-10 text-center">
                <span className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-[var(--green-tint)] text-[var(--selo-green)]">
                  <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-2xl font-bold text-ink">Pagamento confirmado</h2>
                <p className="mt-2 text-ink/60">Liberando seu documento agora…</p>
                <Loader2 className="mx-auto mt-5 w-5 h-5 animate-spin text-[var(--blue-royal)]" aria-hidden="true" />
              </div>
            ) : paymentState === "expired" ? (
              <PixStateContent
                icon={<Clock3 className="w-7 h-7" />}
                title="Este Pix expirou"
                description="Por segurança, gere uma nova cobrança para continuar. Nenhum pagamento foi confirmado neste pedido."
                actionLabel="Gerar novo Pix"
                onAction={backToCheckout}
              />
            ) : paymentState === "failed" ? (
              <PixStateContent
                icon={<RefreshCw className="w-7 h-7" />}
                title="Pagamento não aprovado"
                description="Você pode voltar ao checkout e criar uma nova cobrança sem perder o preenchimento."
                actionLabel="Voltar ao checkout"
                onAction={backToCheckout}
              />
            ) : paymentState === "error" ? (
              <PixStateContent
                icon={<RefreshCw className="w-7 h-7" />}
                title="Não conseguimos confirmar agora"
                description="Seu pedido continua salvo. Tente novamente em instantes ou volte ao checkout."
                actionLabel="Voltar ao checkout"
                onAction={backToCheckout}
              />
            ) : (
              <div className="space-y-7">
                <div className="flex flex-col items-center">
                  <div className="grid place-items-center w-[248px] h-[248px] sm:w-[280px] sm:h-[280px] rounded-2xl bg-white border border-[var(--border)] p-4 shadow-sm">
                    {qrSource ? (
                      <img
                        src={qrSource}
                        alt="QR Code Pix"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-ink/45">
                        <Loader2 className="mx-auto w-7 h-7 animate-spin" aria-hidden="true" />
                        <p className="mt-3 text-sm">Carregando QR Code…</p>
                      </div>
                    )}
                  </div>

                  {pix?.expiresAt && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink/55">
                      <Clock3 className="w-4 h-4" aria-hidden="true" />
                      Pix válido até {formatExpiration(pix.expiresAt)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-ink/55 font-semibold">
                    Pix copia e cola
                  </label>
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-paper px-4 py-3">
                    <p className="break-all font-mono text-xs sm:text-sm leading-relaxed text-ink/75 select-all">
                      {pix?.brCode || "Carregando código Pix…"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyPixCode()}
                    disabled={!pix?.brCode}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[var(--blue-royal)] text-white font-bold hover:bg-[#1e44a8] transition-colors disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    Copiar código Pix
                  </button>
                </div>

                <div className="rounded-2xl bg-[var(--green-tint)]/60 border border-[var(--selo-green)]/20 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="grid place-items-center w-9 h-9 shrink-0 rounded-full bg-white text-[var(--selo-green)]">
                      <QrCode className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-ink">Como pagar</p>
                      <ol className="mt-1.5 text-sm text-ink/65 space-y-1 list-decimal list-inside">
                        <li>Abra o Pix no aplicativo do seu banco.</li>
                        <li>Escaneie o QR Code ou cole o código acima.</li>
                        <li>Confirme o valor e conclua o pagamento.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-ink/55">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--blue-royal)]" aria-hidden="true" />
                  Aguardando confirmação do pagamento
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink/50">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            Pagamento criptografado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Confirmação automática
          </span>
        </div>
      </div>
    </section>
  );
}

function PixStateContent({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="py-10 text-center">
      <span className="mx-auto grid place-items-center w-14 h-14 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)]">
        {icon}
      </span>
      <h2 className="mt-4 text-xl font-bold text-ink">{title}</h2>
      <p className="mt-2 mx-auto max-w-md text-ink/60">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-6 inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[var(--blue-royal)] text-white font-semibold"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function PixStateCard({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <section className="pt-[72px] min-h-[70vh] grid place-items-center bg-paper px-4">
      <div className="max-w-md text-center rounded-2xl border border-[var(--border)] bg-surface p-8">
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-ink/60">{description}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[var(--blue-royal)] text-white font-semibold"
        >
          Voltar ao checkout
        </button>
      </div>
    </section>
  );
}
