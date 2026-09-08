import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  Handshake,
  Home,
  MessageCircleQuestion,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { PUBLIC_MODELS } from "@/lib/catalog/public-models";
import { Pet } from "@/components/docfacil/pet";
import { HeroScene } from "./hero-scene";

const featured = PUBLIC_MODELS.filter((model) => model.popular).slice(0, 4);

const faqs = [
  [
    "Preciso entender de Direito?",
    "Não. As perguntas explicam o que informar em linguagem simples. Em casos complexos ou com conflito, procure orientação jurídica.",
  ],
  [
    "Preciso criar uma conta?",
    "Você pode conhecer os modelos sem cadastro. Para salvar e gerar um documento, a conta é necessária.",
  ],
  [
    "É gratuito?",
    "Com uma conta, você pode gerar um documento gratuito por mês entre os modelos identificados como gratuitos. O PDF gratuito recebe marca d’água.",
  ],
  [
    "Consigo fazer pelo celular?",
    "Sim. O preenchimento foi pensado para funcionar em telas pequenas e você pode conferir a prévia antes de concluir.",
  ],
  [
    "Meus dados ficam protegidos?",
    "Usamos autenticação e controles de acesso para que cada pessoa consulte seus próprios documentos. Consulte a Política de Privacidade para conhecer o tratamento dos dados.",
  ],
  [
    "O documento tem validade jurídica?",
    "A validade depende do conteúdo, da situação, das assinaturas e de eventuais formalidades legais. O DocFácil não promete validade automática e não substitui advogado ou cartório.",
  ],
];

export function LandingPage() {
  return (
    <>
      {/* Hero com papéis físicos em profundidade e cena interativa */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:pb-24 lg:pt-32">
        {/* Folhas A4 decorativas de fundo (DNA visual proprietário DocFácil) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 overflow-hidden"
        >
          <div className="absolute -top-12 -right-8 w-[400px] h-[540px] rounded-2xl bg-white border border-slate-200/80 rotate-[8deg] shadow-xs hidden lg:block" />
          <div className="absolute top-8 -right-20 w-[400px] h-[540px] rounded-2xl bg-white border border-slate-200/80 rotate-[14deg] shadow-xs hidden lg:block" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/60 px-4 py-1.5 text-xs sm:text-sm font-bold text-emerald-800 shadow-xs">
              <ShieldCheck className="size-4 text-emerald-700" />
              Documentos claros, do começo ao PDF
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-6xl">
              Crie contratos e declarações com orientação em cada etapa
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Escolha o documento, responda perguntas simples e confira tudo antes de gerar um PDF
              profissional. Sem precisar decifrar juridiquês sozinho.
            </p>
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
              <Link
                href="/documentos"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-900 px-7 font-bold text-white shadow-md shadow-blue-950/15 transition-all hover:bg-blue-950 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-700 active:scale-[0.99]"
              >
                <span>Encontrar meu documento</span>
                <ArrowRight className="size-5" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 font-bold text-slate-800 shadow-xs transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-700"
              >
                Ver como funciona
              </a>
            </div>
            <p className="mt-4 text-xs sm:text-sm text-slate-500">
              Conheça todos os modelos antes de criar sua conta.
            </p>
          </div>

          {/* Cena interativa do produto com a Corujinha oficial e papéis sobrepostos */}
          <div className="relative">
            <HeroScene />
          </div>
        </div>
      </section>

      {/* Intenções / "O nome jurídico pode esperar" */}
      <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
            Comece pela sua situação
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            O nome jurídico pode esperar
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Você não precisa saber de cabeça o nome técnico da peça jurídica. Escolha o objetivo e
            encontre o modelo certo:
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Alugar um imóvel",
                body: "Contratos para moradia ou negócio com garantia e vistoria",
                icon: Home,
                badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-100",
              },
              {
                title: "Declarar uma informação",
                body: "Residência, renda, dependência e outros fatos do cotidiano",
                icon: FileText,
                badgeBg: "bg-blue-50 text-blue-900 border-blue-100",
              },
              {
                title: "Autorizar alguém",
                body: "Procurações com poderes específicos para representação",
                icon: UserCheck,
                badgeBg: "bg-amber-50 text-amber-900 border-amber-200/80",
              },
              {
                title: "Formalizar um acordo",
                body: "Compra e venda, empréstimo de bens, serviços e parceria",
                icon: Handshake,
                badgeBg: "bg-indigo-50 text-indigo-900 border-indigo-100",
              },
            ].map(({ title, body, icon: Icon, badgeBg }) => (
              <Link
                key={title}
                href={`/documentos?busca=${encodeURIComponent(title)}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-700"
              >
                <div>
                  <div
                    className={`inline-grid size-11 place-items-center rounded-xl border ${badgeBg} shadow-xs transition-transform group-hover:scale-105`}
                  >
                    <Icon className="size-5.5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-blue-900 group-hover:text-blue-950">
                  Ver opções{" "}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona — progressão visual 1 → 2 → 3 */}
      <section id="como-funciona" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              Como funciona
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              Você responde. O documento ganha forma.
            </h2>
          </div>

          <div className="relative mt-12">
            {/* Linha conectora de progresso no desktop */}
            <div
              className="absolute top-8 left-16 right-16 hidden h-0.5 border-t-2 border-dashed border-blue-200 -z-0 md:block"
              aria-hidden="true"
            />

            <ol className="grid gap-6 md:grid-cols-3">
              {[
                {
                  n: "1",
                  t: "Escolha com segurança",
                  b: "Veja quando usar cada modelo e quais informações serão necessárias antes de iniciar.",
                },
                {
                  n: "2",
                  t: "Preencha com orientação",
                  b: "Responda uma etapa por vez com dicas da corujinha em linguagem acessível e exemplos práticos.",
                },
                {
                  n: "3",
                  t: "Confira e gere",
                  b: "Revise a prévia atualizada em tempo real e receba o documento formatado em PDF para imprimir ou assinar.",
                },
              ].map(({ n, t, b }) => (
                <li
                  key={n}
                  className="relative z-10 flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-blue-900 text-lg font-extrabold text-white shadow-md shadow-blue-950/20">
                    {n}
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-slate-950">{t}</h3>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600">{b}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Modelos em destaque — seção azul marinho distintiva */}
      <section className="bg-blue-950 px-4 py-16 text-white sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
                Modelos em destaque
              </p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                Documentos para situações reais
              </h2>
            </div>
            <Link
              href="/documentos"
              className="inline-flex min-h-11 items-center gap-2 font-bold text-emerald-300 hover:text-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Ver catálogo completo <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {featured.map((m) => (
              <Link
                key={m.slug}
                href={`/documentos/${m.slug}`}
                className="group flex flex-col justify-between rounded-2xl bg-white/[0.08] p-6 ring-1 ring-white/15 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.13] hover:ring-emerald-400/40 focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    {m.categoria}
                  </p>
                  <h3 className="mt-3 text-xl font-bold text-white group-hover:text-emerald-200 transition-colors">
                    {m.nome}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-white/70">{m.descricao}</p>
                </div>
                <p className="mt-6 text-sm font-semibold text-emerald-300 flex items-center justify-between border-t border-white/10 pt-4">
                  <span>Cerca de {m.minutos} min</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios e Acesso Gratuito */}
      <section className="px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              Feito para dar clareza
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              Ajuda prática sem promessas mágicas
            </h2>
            <div className="mt-8 grid gap-5">
              {[
                [
                  MessageCircleQuestion,
                  "Perguntas que fazem sentido",
                  "Cada etapa explica o dado necessário e mostra exemplos claros.",
                ],
                [
                  FileCheck2,
                  "Prévia antes do final",
                  "Confira o conteúdo do documento atualizado antes de concluir.",
                ],
                [
                  Smartphone,
                  "Do celular ao PDF",
                  "Faça o processo inteiro em uma interface responsiva pensada para o polegar.",
                ],
                [
                  ShieldCheck,
                  "Seus documentos na sua conta",
                  "Autenticação e regras de acesso protegem a sua biblioteca pessoal.",
                ],
              ].map(([Icon, title, body]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <div key={String(title)} className="flex gap-4">
                    <div className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <I className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{String(title)}</h3>
                      <p className="mt-1 leading-relaxed text-slate-600 text-sm sm:text-base">
                        {String(body)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-7 sm:p-9 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-900">
                <Sparkles className="size-6" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
                Acesso Inicial
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-extrabold text-slate-950 sm:text-3xl">
              Uma opção gratuita para começar
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-700">
              Com uma conta, você pode gerar uma vez por mês um dos modelos marcados como gratuitos.
              O PDF dessa modalidade inclui marca d’água.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Catálogo aberto para consulta e simulação",
                "Conta necessária para salvar e gerar",
                "Condições e marca d’água informadas antes de concluir",
              ].map((x) => (
                <li key={x} className="flex gap-2.5 items-center text-sm font-medium text-slate-800">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-700" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/documentos"
              className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-emerald-800 px-6 font-bold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              Ver modelos disponíveis
            </Link>
          </aside>
        </div>
      </section>

      {/* Dúvidas frequentes */}
      <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
            Dúvidas frequentes
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            Antes de começar, vale saber
          </h2>
          <div className="mt-8 divide-y divide-slate-200">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-5 font-bold text-slate-950 transition hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded-lg py-1">
                  <span className="text-base sm:text-lg">{q}</span>
                  <span
                    className="text-2xl text-blue-900 transition-transform group-open:rotate-45 select-none"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-3xl pb-2 pr-8 leading-relaxed text-slate-600 text-sm sm:text-base">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final — Com a Mascote Oficial em destaque */}
      <section className="px-4 py-16 text-center sm:px-6 lg:py-24">
        <div className="relative mx-auto max-w-3xl rounded-3xl border border-amber-200/80 bg-amber-50/80 p-8 sm:p-12 shadow-sm">
          {/* Mascote Corujinha oficial em destaque */}
          <div className="mx-auto flex justify-center mb-4">
            <Pet
              mood="feliz"
              size={90}
              lookAtCursor={true}
              showDashedCircle={true}
            />
          </div>

          <h2 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            Seu documento pode começar com uma pergunta simples
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-600 text-base sm:text-lg">
            Conte o que você precisa resolver e encontre o modelo certo para preencher no seu ritmo.
          </p>
          <Link
            href="/documentos"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-900 px-7 font-bold text-white shadow-md shadow-blue-950/15 transition-all hover:bg-blue-950 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-700 active:scale-[0.99]"
          >
            <span>Escolher um documento</span>
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
