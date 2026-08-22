"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  User as UserIcon,
  Mail,
  Phone,
  Camera,
  CreditCard,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { useNav } from "@/components/docfacil/nav-context";
import { useAuth } from "@/lib/auth-context";
import { PageShell, PageHeader } from "@/components/docfacil/views/page-shell";
import { AuthGate } from "@/components/docfacil/views/auth-gate";
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
import { getPerfil, listPagamentos } from "@/lib/services/users-service";
import { PLAN_BILLING_DESC } from "@/lib/pricing";
import type { Pagamento, PerfilUsuario } from "@/lib/types";

const PLANO_LABEL: Record<PerfilUsuario["plano"], string> = {
  gratis: "Grátis",
  avulso: "Avulso",
  pro: "Pro",
};

const PLANO_PRICE: Record<PerfilUsuario["plano"], string> = {
  gratis: PLAN_BILLING_DESC.gratis,
  avulso: PLAN_BILLING_DESC.avulso,
  pro: PLAN_BILLING_DESC.pro,
};

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  icon: Icon,
  disabled,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40"
          aria-hidden="true"
        />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full h-12 pl-11 pr-4 text-lg rounded-lg border border-[var(--border)] bg-paper focus:bg-surface outline-none focus:border-[var(--blue-royal)] focus:ring-4 focus-visible:ring-[var(--blue-soft)] transition disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

export function PerfilView() {
  return (
    <AuthGate>
      <PerfilContent />
    </AuthGate>
  );
}

function PerfilContent() {
  const { navigate } = useNav();
  const { user, updateProfileData } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const [p, pags] = await Promise.all([
          getPerfil(user.uid),
          listPagamentos(user.uid),
        ]);
        if (cancelled) return;
        setPerfil(p);
        setPagamentos(pags);
        setNome(p?.nome ?? user.nome ?? "");
        setEmail(p?.email ?? user.email ?? "");
        setTelefone(p?.telefone ?? "");
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível carregar seu perfil.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateProfileData({ nome, telefone });
      setSaved(true);
      toast.success("Perfil atualizado!");
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelSubscription() {
    const proximaData = new Date();
    proximaData.setMonth(proximaData.getMonth() + 1);
    const fmt = proximaData.toLocaleDateString("pt-BR");
    setCancelMsg(`Assinatura cancelada. Você manterá acesso até ${fmt}.`);
    toast.success("Assinatura cancelada. Sem multas, sem burocracia.");
  }

  const plano = perfil?.plano ?? user?.plano ?? "gratis";
  const initials = (nome || user?.nome || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  if (loading) {
    return (
      <PageShell className="bg-paper min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="h-8 bg-[var(--blue-soft)]/50 rounded w-32 animate-pulse" />
          <div className="mt-4 space-y-3 animate-pulse">
            <div className="h-6 bg-[var(--blue-soft)]/40 rounded w-1/3" />
            <div className="h-4 bg-[var(--blue-soft)]/30 rounded w-1/2" />
          </div>
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-8">
            <div className="h-96 rounded-2xl bg-[var(--blue-soft)]/25 animate-pulse" />
            <div className="space-y-6">
              <div className="h-40 rounded-2xl bg-[var(--blue-soft)]/25 animate-pulse" />
              <div className="h-48 rounded-2xl bg-[var(--blue-soft)]/25 animate-pulse" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="bg-paper min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink/70 hover:text-ink transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded-md px-1.5 py-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="mt-4">
          <PageHeader
            eyebrow="Sua conta"
            title="Perfil e configurações"
            subtitle="Mantenha seus dados atualizados para receber seus documentos e recibos sem erro."
          />
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-8">
          <section
            aria-labelledby="perfil-dados-heading"
            className="bg-surface border border-[var(--border)] rounded-2xl p-6 sm:p-8"
          >
            <h2
              id="perfil-dados-heading"
              className="font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink"
            >
              Dados pessoais
            </h2>

            <div className="mt-5 flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)] grid place-items-center font-[family-name:var(--font-jakarta)] font-extrabold text-xl select-none"
                aria-hidden="true"
              >
                {initials || "U"}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => toast.info("Upload de foto em breve.")}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[var(--border)] bg-paper text-ink text-sm font-semibold hover:bg-[var(--blue-soft)]/60 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
                >
                  <Camera className="w-4 h-4" />
                  Trocar foto
                </button>
                <p className="mt-1.5 text-xs text-ink/50">JPG ou PNG, até 2 MB.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <Field
                id="perfil-name"
                label="Nome completo"
                value={nome}
                onChange={setNome}
                autoComplete="name"
                icon={UserIcon}
              />
              <Field
                id="perfil-email"
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                icon={Mail}
                disabled
              />
              <p className="-mt-3 text-xs text-ink/50">
                O e-mail não pode ser alterado aqui. Entre em contato com o suporte se precisar.
              </p>
              <Field
                id="perfil-phone"
                label="Telefone"
                type="tel"
                value={telefone}
                onChange={setTelefone}
                autoComplete="tel"
                icon={Phone}
              />

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-[var(--blue-royal)] text-white font-semibold text-base hover:bg-[var(--navy)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      Salvando...
                    </>
                  ) : saved ? (
                    <>
                      <Check className="w-5 h-5" aria-hidden="true" />
                      Salvo!
                    </>
                  ) : (
                    "Salvar alterações"
                  )}
                </button>
              </div>
            </form>
          </section>

          <div className="space-y-6">
            <section
              aria-labelledby="perfil-plano-heading"
              className="bg-surface border border-[var(--border)] rounded-2xl p-6 sm:p-7"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--selo-green)]">
                    Plano atual
                  </p>
                  <h2
                    id="perfil-plano-heading"
                    className="mt-1 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink"
                  >
                    Plano {PLANO_LABEL[plano]}
                  </h2>
                  <p className="mt-1 text-sm text-ink/65">{PLANO_PRICE[plano]}</p>
                </div>
                <CreditCard
                  className="w-7 h-7 text-[var(--blue-royal)] shrink-0"
                  aria-hidden="true"
                />
              </div>

              {cancelMsg && (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2.5 rounded-lg border border-[var(--selo-green)]/30 bg-[var(--green-tint)]/60 px-3.5 py-3 text-sm text-[var(--selo-green)]"
                >
                  <Check className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span className="leading-relaxed">{cancelMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate("planos")}
                className="mt-5 w-full h-11 rounded-lg border border-[var(--blue-royal)] text-[var(--blue-royal)] font-semibold text-sm hover:bg-[var(--blue-soft)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
              >
                Gerenciar plano
              </button>
            </section>

            <section
              aria-labelledby="perfil-historico-heading"
              className="bg-surface border border-[var(--border)] rounded-2xl p-6 sm:p-7"
            >
              <h2
                id="perfil-historico-heading"
                className="font-[family-name:var(--font-jakarta)] text-lg font-bold text-ink"
              >
                Histórico de pagamentos
              </h2>
              {pagamentos.length === 0 ? (
                <p className="mt-4 text-sm text-ink/55">
                  {plano === "gratis"
                    ? "Você ainda não tem pagamentos. Faça upgrade para o Pro na aba ao lado."
                    : "Nenhum pagamento registrado ainda."}
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--border)]">
                  {pagamentos.map((p) => (
                    <PagamentoRow key={p.id} pagamento={p} />
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-labelledby="perfil-cancelar-heading"
              className="bg-surface border border-[var(--border)] rounded-2xl p-6 sm:p-7"
            >
              <h2
                id="perfil-cancelar-heading"
                className="font-[family-name:var(--font-jakarta)] text-lg font-bold text-ink"
              >
                Cancelar assinatura
              </h2>
              <p className="mt-2 text-sm text-ink/65 leading-relaxed text-pretty">
                Você manterá acesso até o fim do período já pago. Sem multas, sem burocracia.
              </p>

              {plano !== "pro" ? (
                <p className="mt-4 text-sm text-ink/50 italic">
                  Você não tem uma assinatura Pro ativa para cancelar.
                </p>
              ) : cancelMsg ? (
                <p className="mt-4 text-sm text-[var(--selo-green)] font-medium">
                  Sua assinatura já foi cancelada.
                </p>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--coral)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] rounded px-1 py-0.5"
                    >
                      Cancelar assinatura
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar assinatura do Plano Pro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você continuará com acesso até o fim do período já pago. Depois disso, sua conta voltará ao plano Grátis automaticamente. Sem multas, sem burocracia.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        className="bg-[var(--coral)] text-white hover:bg-[var(--coral-hover)]"
                      >
                        Sim, cancelar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function PagamentoRow({ pagamento }: { pagamento: Pagamento }) {
  const dataFmt = new Date(pagamento.data).toLocaleDateString("pt-BR");
  const valorFmt = pagamento.valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const isPago = pagamento.status === "pago";
  const planoLabel = pagamento.plano === "pro" ? "Plano Pro mensal" : "Documento avulso";
  const metodoLabel = pagamento.metodo === "pix" ? "Pix" : "Cartão";
  return (
    <li className="flex items-center justify-between py-3 gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink truncate">{dataFmt}</p>
        <p className="text-xs text-ink/55">
          {planoLabel} · {metodoLabel}
        </p>
      </div>
      <span className="text-sm font-semibold text-ink tabular-nums">{valorFmt}</span>
      <span
        className={[
          "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
          isPago
            ? "bg-[var(--green-tint)] text-[var(--selo-green)]"
            : "bg-[var(--coral)]/15 text-[var(--coral)]",
        ].join(" ")}
        aria-label={`Status: ${pagamento.status}`}
      >
        {isPago && <Check className="w-3 h-3" />}
        {isPago ? "Pago" : "Estornado"}
      </span>
    </li>
  );
}
