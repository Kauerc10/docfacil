"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useNav } from "./nav-context";
import {
  recordConsent,
  TERMS_VERSION,
  type ConsentFlow,
  type ConsentDocument,
} from "@/lib/services/consent-service";
import { SUCCESS_MESSAGES } from "@/lib/constants";
import { COMPANY } from "@/lib/company";

/**
 * TermsConsentModal — força o aceite de Termos + Privacidade antes de
 * continuar um fluxo sensível (cadastro, checkout, geração de documento).
 *
 * Props:
 * - open / onClose        — controle de visibilidade
 * - onAccept: () => void  — chamado APÓS o consentimento ser persistido
 * - flow                  — "cadastro" | "checkout" | "document-generation"
 * - userEmail? / userId?  — identificação do titular (para o registro)
 *
 * Comportamento:
 * - 3 checkboxes: Termos (obrigatório), Privacidade (obrigatório),
 *   Marketing (opcional).
 * - Botão "Aceitar e continuar" desabilitado enquanto os dois obrigatórios
 *   não estiverem marcados.
 * - Ao confirmar, chama `recordConsent()` (consent-service) e dispara
 *   `onAccept()` no sucesso.
 * - Links de Termos/Privacidade chamam `navigate("termos"|"privacidade")`.
 * - Backdrop/ESC são bloqueados para os flows "cadastro" e "checkout"
 *   (modal manual) — o usuário precisa decidir entre aceitar ou cancelar
 *   via botão. Em "document-generation", permite fechar normalmente.
 *
 * Nota técnica: o estado dos checkboxes vive num componente interno
 * (`ConsentForm`) montado apenas quando `open === true`. Assim evitamos
 * o anti-pattern de chamar setState dentro de useEffect para "resetar"
 * o formulário a cada abertura — o React já zera o estado ao desmontar.
 */
export interface TermsConsentModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  flow: ConsentFlow;
  userEmail?: string;
  userId?: string;
}

export function TermsConsentModal({
  open,
  onClose,
  onAccept,
  flow,
  userEmail,
  userId,
}: TermsConsentModalProps) {
  // Bloqueio de backdrop/ESC para flows sensíveis. Em "document-generation",
  // o usuário pode fechar normalmente; nos flows de cadastro/checkout, ele
  // precisa decidir entre aceitar ou cancelar via botão explícito.
  const lockClose = flow === "cadastro" || flow === "checkout";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && lockClose) {
          // Ignora tentativa de fechar via ESC/backdrop nos flows sensíveis.
          return;
        }
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!lockClose}
        className="sm:max-w-lg"
        onEscapeKeyDown={(e) => {
          if (lockClose) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (lockClose) e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="grid place-items-center w-10 h-10 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)]">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </span>
            <DialogTitle className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-ink tracking-tight">
              Aceite dos Termos
            </DialogTitle>
          </div>
          <DialogDescription className="text-ink/65 text-base">
            Para continuar, leia e aceite nossos termos. É rápido!
          </DialogDescription>
        </DialogHeader>

        {/* Monta o form só quando aberto — estado dos checkboxes nasce
            limpo a cada abertura, sem precisar de useEffect para resetar. */}
        {open && (
          <ConsentForm
            flow={flow}
            userId={userId}
            userEmail={userEmail}
            lockClose={lockClose}
            onClose={onClose}
            onAccept={onAccept}
          />
        )}

        <p className="mt-3 text-xs text-ink/45 text-center">
          Versão {TERMS_VERSION} · {COMPANY.name}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function ConsentForm({
  flow,
  userId,
  userEmail,
  lockClose,
  onClose,
  onAccept,
}: {
  flow: ConsentFlow;
  userId?: string;
  userEmail?: string;
  lockClose: boolean;
  onClose: () => void;
  onAccept: () => void;
}) {
  const { navigate } = useNav();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = acceptedTerms && acceptedPrivacy && !submitting;

  async function handleAccept() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const documents: ConsentDocument[] = acceptedMarketing
        ? ["termos", "privacidade", "marketing"]
        : ["termos", "privacidade"];
      await recordConsent({
        userId: userId || "guest",
        userEmail: userEmail || "guest@docfacil.com",
        flow,
        documents,
        termsVersion: TERMS_VERSION,
      });
      toast.success(SUCCESS_MESSAGES.CONSENT_RECORDED);
      onAccept();
    } catch (e) {
      console.error("[TermsConsentModal] falha ao registrar consent:", e);
      toast.error("Não foi possível registrar seu aceite. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mt-4 space-y-4">
        {/* Termos */}
        <ConsentRow
          id="consent-terms"
          checked={acceptedTerms}
          onChecked={(v) => setAcceptedTerms(Boolean(v))}
          required
          label={
            <>
              Li e aceito os{" "}
              <button
                type="button"
                onClick={() => navigate("termos")}
                className="text-[var(--blue-royal)] font-medium hover:underline"
              >
                Termos de Uso
              </button>
              .
            </>
          }
        />

        {/* Privacidade */}
        <ConsentRow
          id="consent-privacy"
          checked={acceptedPrivacy}
          onChecked={(v) => setAcceptedPrivacy(Boolean(v))}
          required
          label={
            <>
              Li e aceito a{" "}
              <button
                type="button"
                onClick={() => navigate("privacidade")}
                className="text-[var(--blue-royal)] font-medium hover:underline"
              >
                Política de Privacidade
              </button>
              .
            </>
          }
        />

        {/* Marketing */}
        <ConsentRow
          id="consent-marketing"
          checked={acceptedMarketing}
          onChecked={(v) => setAcceptedMarketing(Boolean(v))}
          label={
            <>
              Quero receber novidades e ofertas do {COMPANY.productName}{" "}
              <span className="text-ink/50 font-normal">(opcional)</span>.
            </>
          }
        />
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        {!lockClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-paper transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleAccept}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--coral)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--coral-hover)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--coral)]/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Registrando…
            </>
          ) : (
            "Aceitar e continuar"
          )}
        </button>
      </div>
    </>
  );
}

function ConsentRow({
  id,
  checked,
  onChecked,
  label,
  required,
}: {
  id: string;
  checked: boolean;
  onChecked: (v: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-paper transition-colors"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChecked(v === true)}
        className="mt-0.5"
      />
      <span className="text-sm text-ink/75 leading-relaxed">
        {label}
        {required && <span className="text-[var(--coral)] font-semibold"> *</span>}
      </span>
    </label>
  );
}
