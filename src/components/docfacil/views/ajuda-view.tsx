"use client";

import { useState, type FormEvent } from "react";
import { Search, ChevronLeft, MessageCircle, Mail, Clock } from "lucide-react";
import { useNav } from "@/components/docfacil/nav-context";
import { PageShell, PageHeader } from "@/components/docfacil/views/page-shell";
import { COMPANY } from "@/lib/company";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FAQ = { q: string; a: string };

const FAQS: FAQ[] = [
  {
    q: "O documento gerado tem validade jurídica?",
    a: "Sim. Os modelos do DocFacil seguem os requisitos formais do Código Civil e da legislação específica de cada tipo de documento. Quando preenchido corretamente com os dados das partes, o documento tem a mesma validade de um elaborado em cartório. Para alguns casos (inventário, divórcio com bens, testamento), a lei exige registro em cartório — sinalizamos isso com clareza durante o preenchimento.",
  },
  {
    q: "Preciso registrar em cartório?",
    a: "Depende do tipo. Documentos como contratos de aluguel, recibos e declarações simples dispensam registro. Já escrituras, inventários, divórcios e testamentos exigem registro em cartório ou homologação judicial. O DocFacil te avisa no passo a passo sempre que o registro for necessário.",
  },
  {
    q: "Como faço para editar um documento depois?",
    a: "Entre na sua conta, vá em “Meus documentos” e clique no documento que deseja ajustar. Você pode editar os campos, gerar um novo PDF e baixar quantas vezes quiser — sem custo extra dentro do seu plano.",
  },
  {
    q: "Quais formas de pagamento aceitam?",
    a: "Cartão de crédito (Visa, Mastercard, Elo, Amex), Pix e boleto bancário. No Plano Pro você escolhe entre cobrança mensal ou anual com desconto.",
  },
  {
    q: "Posso cancelar o plano Pro quando quiser?",
    a: "Sim, a qualquer momento, direto pelo seu perfil — sem ligação, sem fila de espera, sem multa. Você mantém o acesso até o fim do período já pago.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Usamos criptografia TLS em toda a navegação e armazenamento, servidores em data center certificado no Brasil (LGPD) e nunca compartilhamos seus dados com terceiros. Você pode solicitar a exclusão dos seus dados a qualquer momento pelo e-mail de contato.",
  },
  {
    q: "E se eu travar no meio do preenchimento?",
    a: "Seu progresso é salvo automaticamente a cada campo. Você pode sair e voltar quando quiser — o documento fica no “rascunho” da sua conta. Se preferir, nossa equipe atende pelo WhatsApp de segunda a sábado, das 8h às 20h, sem robô.",
  },
  {
    q: "Funciona para qualquer tipo de documento?",
    a: "O DocFacil cobre hoje mais de 80 modelos entre contratos, declarações, recibos, procurações e documentos de família. Se o que você precisa não está no catálogo, fale com a gente pelo WhatsApp — avaliamos incluir novos modelos.",
  },
];

/**
 * AjudaView (spec 4.12) — help center.
 * The "falar com uma pessoa" WhatsApp block is the key differentiator —
 * it's prominent, not buried at the bottom.
 */
export function AjudaView() {
  const { navigate } = useNav();
  const [query, setQuery] = useState("");

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Prototype: no real search backend — just visually filter the FAQ list.
  }

  const filtered = query.trim()
    ? FAQS.filter(
        (f) =>
          f.q.toLowerCase().includes(query.toLowerCase()) ||
          f.a.toLowerCase().includes(query.toLowerCase())
      )
    : FAQS;

  return (
    <PageShell className="bg-paper min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Voltar */}
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
            eyebrow="Central de ajuda"
            title="Como podemos ajudar?"
            subtitle="Procure uma resposta abaixo ou fale com a nossa equipe — pessoas de verdade, sem robô."
          />
        </div>

        {/* Busca */}
        <form onSubmit={handleSearch} className="mt-8" role="search">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40"
              aria-hidden="true"
            />
            <input
              id="ajuda-busca"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar na ajuda..."
              aria-label="Buscar na ajuda"
              className="w-full h-14 pl-12 pr-4 text-lg rounded-xl border border-[var(--border)] bg-surface outline-none focus:border-[var(--blue-royal)] focus:ring-4 focus:ring-[var(--blue-soft)] transition placeholder:text-ink/40 shadow-sm"
            />
          </div>
        </form>

        {/* FAQ */}
        <section aria-labelledby="ajuda-faq-heading" className="mt-10">
          <h2
            id="ajuda-faq-heading"
            className="font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink mb-3"
          >
            Perguntas frequentes
          </h2>

          {filtered.length === 0 ? (
            <div className="bg-surface border border-[var(--border)] rounded-2xl p-6 text-center">
              <p className="text-ink/70">
                Não encontramos nada para “{query}”. Tente outro termo ou fale
                com a gente no WhatsApp abaixo.
              </p>
            </div>
          ) : (
            <div className="bg-surface border border-[var(--border)] rounded-2xl px-5 sm:px-6">
              <Accordion type="single" collapsible className="w-full">
                {filtered.map((f, i) => (
                  <AccordionItem
                    key={f.q}
                    value={`item-${i}`}
                    className={i === 0 ? "border-t-0" : undefined}
                  >
                    <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-ink hover:no-underline py-5">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-ink/70 leading-relaxed">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </section>

        {/* Destaque — falar com uma pessoa */}
        <section
          aria-labelledby="ajuda-whatsapp-heading"
          className="mt-10 bg-[var(--green-tint)] rounded-2xl p-7 sm:p-10 text-center"
        >
          <div className="mx-auto max-w-xl">
            <h2
              id="ajuda-whatsapp-heading"
              className="font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold text-ink tracking-tight"
            >
              Prefere falar com uma pessoa?
            </h2>
            <p className="mt-3 text-ink/75 text-base sm:text-lg leading-relaxed text-pretty">
              Nossa equipe atende de segunda a sábado, das 8h às 20h. Sem robô,
              sem fila de menu.
            </p>

            <a
              href={COMPANY.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2.5 h-13 px-7 py-3.5 rounded-xl text-white font-semibold text-lg transition hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--selo-green)]/40"
              style={{ backgroundColor: "#25D366", minHeight: "3.25rem" }}
            >
              <MessageCircle className="w-5 h-5" />
              Chamar no WhatsApp
            </a>
          </div>
        </section>

        {/* Contatos alternativos */}
        <section
          aria-labelledby="ajuda-contato-heading"
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="bg-surface border border-[var(--border)] rounded-2xl p-6">
            <div className="flex items-center gap-2 text-ink">
              <Mail className="w-5 h-5 text-[var(--blue-royal)]" aria-hidden="true" />
              <h3 className="font-semibold text-base">E-mail</h3>
            </div>
            <p className="mt-2 text-sm text-ink/70">
              <a
                href={`mailto:${COMPANY.email}`}
                className="text-[var(--blue-royal)] font-medium hover:underline"
              >
                {COMPANY.email}
              </a>
              <br />
              Respondemos em até 24h, em dias úteis.
            </p>
          </div>

          <div className="bg-surface border border-[var(--border)] rounded-2xl p-6">
            <div className="flex items-center gap-2 text-ink">
              <Clock className="w-5 h-5 text-[var(--blue-royal)]" aria-hidden="true" />
              <h3 className="font-semibold text-base">Horário de atendimento</h3>
            </div>
            <p className="mt-2 text-sm text-ink/70">
              Segunda a sábado
              <br />
              8h às 20h (horário de Brasília)
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
