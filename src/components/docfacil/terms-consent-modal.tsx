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
 * - onAccept: recebe os documentos aceitos e prossegue o fluxo.
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
  onAccept: (documents: ConsentDocument[]) => Promise<void> | void;
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
  const lockClose = flow === "cadastro" || flow === "checkout";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && lockClose) return;
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
  onAccept: (documents: ConsentDocument[]) => Promise<void> | void;
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

      if (flow === "cadastro") {
        // O callback cria/autentica a conta antes de registrar o aceite.
        await onAccept(documents);
      } else {
        if (!userId) {
          throw new Error("Identificação do consentimento ausente.");
        }
        await recordConsent({
          userId,
          userEmail: userEmail || undefined,
          flow,
          documents,
        });
        await onAccept(documents);
      }
      toast.success(SUCCESS_MESSAGES.CONSENT_RECORDED);
    } catch (e) {
      console.error("[TermsConsentModal] falha ao registrar consent:", e);
      toast.error("Não foi possível registrar seu aceite. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mt-4 space-y-4">
        <ConsentRow
          id="consent-terms"
          checked={acceptedTerms}
          onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
          required
          label="Li e aceito os Termos de Uso"
          linkLabel="Ler Termos de Uso"
          onLink={() => navigate("termos")}
        />

        <ConsentRow
          id="consent-privacy"
          checked={acceptedPrivacy}
          onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
          required
          label="Li e aceito a Política de Privacidade"
          linkLabel="Ler Política de Privacidade"
          onLink={() => navigate("privacidade")}
        />

        <ConsentRow
          id="consent-marketing"
          checked={acceptedMarketing}
          onCheckedChange={(checked) => setAcceptedMarketing(checked === true)}
          label="Quero receber novidades e dicas do DocFacil"
          optional
        />
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="h-11 px-5 rounded-lg border border-[var(--border)] text-ink/70 font-semibold text-sm hover:bg-paper transition disabled:opacity-50"
        >
          {lockClose ? "Cancelar" : "Agora não"}
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={!canSubmit}
          className="h-11 px-5 rounded-lg bg-[var(--blue-royal)] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 hover:brightness-95 transition disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          Aceitar e continuar
        </button>
      </div>
    </>
  );
}

function ConsentRow({
  id,
  checked,
  onCheckedChange,
  label,
  required,
  optional,
  linkLabel,
  onLink,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean | "indeterminate") => void;
  label: string;
  required?: boolean;
  optional?: boolean;
  linkLabel?: string;
  onLink?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-paper/60 p-3.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-medium text-ink cursor-pointer">
          {label}
          {required && <span className="text-[var(--coral)] ml-1">*</span>}
          {optional && <span className="text-ink/45 font-normal ml-1">(opcional)</span>}
        </label>
        {linkLabel && onLink && (
          <button
            type="button"
            onClick={onLink}
            className="mt-1 block text-xs font-semibold text-[var(--blue-royal)] hover:underline"
          >
            {linkLabel}
          </button>
        )}
      </div>
    </div>
  );
}
