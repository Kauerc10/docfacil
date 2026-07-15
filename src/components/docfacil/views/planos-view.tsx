"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, ShieldCheck, CreditCard, Ban } from "lucide-react";

import { PageShell, PageHeader } from "@/components/docfacil/views/page-shell";
import { useNav } from "@/components/docfacil/nav-context";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Plano = {
  id: "gratis" | "avulso" | "pro";
  nome: string;
  preco: string;
  precoSub?: string;
  desc: string;
  features: string[];
  cta: string;
  ctaVariant: "outline" | "coral";
  destaque?: boolean;
  destino: "modelos" | "cadastro" | "checkout";
  checkoutPlan?: "avulso" | "pro";
};

const PLANOS: Plano[] = [
  {
    id: "gratis",
    nome: "Grátis",
    preco: "R$ 0",
    desc: "Para testar e usar de vez em quando",
    features: [
      "3 documentos por mês",
      "Marca d'água no PDF",
      "Sem necessidade de conta",
    ],
    cta: "Começar grátis",
    ctaVariant: "outline",
    destino: "modelos",
  },
  {
    id: "avulso",
    nome: "Avulso",
    preco: "R$ 9,90",
    precoSub: "por documento",
    desc: "Para quem precisa de um documento específico",
    features: [
      "PDF sem marca d'água",
      "Download imediato",
      "Validação de estrutura",
      "Sem assinatura",
    ],
    cta: "Comprar um documento",
    ctaVariant: "outline",
    destino: "checkout",
    checkoutPlan: "avulso",
  },
  {
    id: "pro",
    nome: "Pro",
    preco: "R$ 24,90",
    precoSub: "/mês",
    desc: "Para quem usa todo mês",
    features: [
      "Documentos ilimitados",
      "PDF sem marca d'água",
      "Editar e rebaixar quando quiser",
      "Prioridade no atendimento WhatsApp",
      "Histórico salvo",
    ],
    cta: "Assinar Pro",
    ctaVariant: "coral",
    destaque: true,
    destino: "checkout",
    checkoutPlan: "pro",
  },
];

const REASSURANCES = [
  { icon: Ban, text: "Cancele quando quiser" },
  { icon: CreditCard, text: "Pagamento via Pix ou cartão" },
  { icon: ShieldCheck, text: "Sem fidelidade" },
];

const FAQ = [
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. O plano Pro é mês a mês, sem fidelidade. Você cancela com um clique dentro do seu painel e continua usando até o fim do período já pago.",
  },
  {
    q: "O PDF tem validade jurídica?",
    a: "O documento gerado segue a estrutura exigida para instrumentos particulares e pode ser assinado digitalmente. Para força executiva, recomendamos reconhecimento de firma ou assinatura eletrônica qualificada — te ajudamos nesse passo.",
  },
  {
    q: "Preciso de conta para usar?",
    a: "Não. No plano Grátis você gera até 3 documentos por mês sem cadastro. Para salvar o histórico e baixar PDFs sem marca d'água, aí sim pedimos uma conta rápida (e-mail e senha).",
  },
  {
    q: "E se eu precisar de mais de um documento por mês?",
    a: "Compensa migrar para o Pro: por menos de R$ 1 por dia você tem documentos ilimitados, edição quando quiser e prioridade no WhatsApp. O Avulso é bom só para uma necessidade pontual.",
  },
];

export function PlanosView() {
  const { navigate } = useNav();
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        "[data-planos-card]",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: "[data-planos-grid]",
            start: "top 82%",
            once: true,
          },
        }
      );
    },
    { scope: root }
  );

  return (
    <PageShell>
      <div ref={root} className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <PageHeader
          align="center"
          eyebrow="Planos"
          title="Escolha o plano que cabe no seu momento"
          subtitle="Sem letra miúda. Cancele quando quiser."
        />

        {/* Pricing cards */}
        <div
          data-planos-grid
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch"
        >
          {PLANOS.map((plano) => (
            <PlanCard
              key={plano.id}
              plano={plano}
              onSelect={() => plano.destino === "checkout" ? navigate("checkout", { plan: plano.checkoutPlan }) : navigate(plano.destino)}
            />
          ))}
        </div>

        {/* Reassurance row */}
        <div className="mt-10 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink/70">
          {REASSURANCES.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2"
            >
              <span className="grid place-items-center w-5 h-5 rounded-full bg-[var(--green-tint)] text-[var(--selo-green)]">
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <section
          aria-labelledby="faq-heading"
          className="mt-16 sm:mt-20 max-w-3xl mx-auto"
        >
          <h2
            id="faq-heading"
            className="font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold text-ink tracking-tight text-center"
          >
            Perguntas frequentes
          </h2>
          <p className="mt-2 text-ink/60 text-center">
            Se ficou em dúvida, provavelmente está respondido aqui.
          </p>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 sm:px-7">
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`item-${i}`}
                  className="border-[var(--border)]"
                >
                  <AccordionTrigger className="text-left text-base font-semibold text-ink hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-ink/70 text-base leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function PlanCard({
  plano,
  onSelect,
}: {
  plano: Plano;
  onSelect: () => void;
}) {
  const isCoral = plano.ctaVariant === "coral";
  return (
    <div
      data-planos-card
      className={[
        "relative flex flex-col rounded-2xl p-7 transition-shadow",
        plano.destaque
          ? "bg-[var(--surface)] border-2 border-[var(--blue-royal)] shadow-[0_18px_40px_-18px_rgba(37,84,199,0.35)] md:-translate-y-2"
          : "bg-[var(--surface)] border border-[var(--border)]",
      ].join(" ")}
    >
      {plano.destaque && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-[var(--selo-green)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          Mais Popular
        </span>
      )}

      <h3 className="font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink">
        {plano.nome}
      </h3>
      <p className="mt-1 text-sm text-ink/60 min-h-[2.5rem]">{plano.desc}</p>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--font-jakarta)] text-4xl font-extrabold text-ink tracking-tight">
          {plano.preco}
        </span>
        {plano.precoSub && (
          <span className="text-sm text-ink/55">{plano.precoSub}</span>
        )}
      </div>

      <ul className="mt-6 space-y-3 flex-1">
        {plano.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-ink/80">
            <span
              className={[
                "mt-0.5 grid place-items-center w-5 h-5 shrink-0 rounded-full",
                isCoral
                  ? "bg-[var(--green-tint)] text-[var(--selo-green)]"
                  : "bg-[var(--blue-soft)] text-[var(--blue-royal)]",
              ].join(" ")}
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        className={[
          "mt-7 w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--blue-royal)] focus-visible:ring-offset-[var(--paper)]",
          isCoral
            ? "bg-[var(--coral)] text-white hover:bg-[var(--coral-hover)]"
            : "border border-[var(--blue-royal)] text-[var(--blue-royal)] bg-transparent hover:bg-[var(--blue-soft)]",
        ].join(" ")}
        aria-label={`${plano.cta} — plano ${plano.nome}`}
      >
        {plano.cta}
      </button>
    </div>
  );
}
