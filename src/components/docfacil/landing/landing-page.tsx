import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  MessageCircleQuestion,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { PUBLIC_MODELS } from "@/lib/catalog/public-models";

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
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:pb-24 lg:pt-32">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <p className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
              Documentos claros, do começo ao PDF
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-6xl">
              Crie contratos e declarações com orientação em cada etapa
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Escolha o documento, responda perguntas simples e confira tudo antes de gerar um PDF
              profissional. Sem precisar decifrar juridiquês sozinho.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/documentos"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 font-bold text-white shadow-sm transition hover:bg-blue-950 focus-visible:ring-2 focus-visible:ring-blue-700"
              >
                <span>Encontrar meu documento</span>
                <ArrowRight className="size-5" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 font-bold text-slate-800 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-700"
              >
                Ver como funciona
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Conheça todos os modelos antes de criar sua conta.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-950/10 sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="grid size-11 place-items-center rounded-full bg-amber-100 text-2xl select-none"
                aria-hidden="true"
              >
                🦉
              </div>
              <div>
                <p className="font-bold text-slate-900">A corujinha traduz o caminho</p>
                <p className="text-sm text-slate-500">Dicas no momento certo, sem interromper.</p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                Exemplo de pergunta
              </p>
              <p className="mt-3 text-lg font-bold text-slate-900">Quem vai alugar o imóvel?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Informe o nome como aparece no documento de identidade. Nós explicamos os outros dados
                na sequência.
              </p>
              <div className="mt-5 h-12 rounded-xl border border-slate-300 bg-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Intenções / Porta de entrada */}
      <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
            Comece pela sua situação
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            O nome jurídico pode esperar
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Alugar um imóvel", "Contratos para moradia ou negócio"],
              ["Declarar uma informação", "Residência, renda e outros fatos"],
              ["Autorizar alguém", "Procurações para representação"],
              ["Formalizar um acordo", "Compra, venda, serviço ou empréstimo"],
            ].map(([title, body]) => (
              <Link
                key={title}
                href={`/documentos?busca=${encodeURIComponent(title)}`}
                className="group rounded-2xl border border-slate-200 p-5 transition hover:border-blue-400 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-700"
              >
                <h3 className="font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-900">
                  Ver opções{" "}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              Como funciona
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              Você responde. O documento ganha forma.
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ["1", "Escolha com segurança", "Veja quando usar cada modelo antes de começar."],
              [
                "2",
                "Preencha com orientação",
                "Responda uma etapa por vez, com exemplos e explicações.",
              ],
              [
                "3",
                "Confira e gere",
                "Revise a prévia e receba o documento final em PDF.",
              ],
            ].map(([n, t, b]) => (
              <li key={n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="grid size-10 place-items-center rounded-full bg-blue-900 font-bold text-white">
                  {n}
                </span>
                <h3 className="mt-5 text-xl font-bold text-slate-950">{t}</h3>
                <p className="mt-2 leading-7 text-slate-600">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Destaques */}
      <section className="bg-blue-950 px-4 py-16 text-white sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
                Modelos em destaque
              </p>
              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
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
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featured.map((m) => (
              <Link
                key={m.slug}
                href={`/documentos/${m.slug}`}
                className="group rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  {m.categoria}
                </p>
                <h3 className="mt-3 text-xl font-bold">{m.nome}</h3>
                <p className="mt-3 text-sm leading-6 text-white/70">{m.descricao}</p>
                <p className="mt-5 text-sm font-semibold text-emerald-300 group-hover:translate-x-0.5 transition-transform">
                  Cerca de {m.minutos} min →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios e Acesso Gratuito */}
      <section className="px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              Feito para dar clareza
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              Ajuda prática sem promessas mágicas
            </h2>
            <div className="mt-8 grid gap-5">
              {[
                [
                  MessageCircleQuestion,
                  "Perguntas que fazem sentido",
                  "Cada etapa explica o dado necessário e mostra exemplos.",
                ],
                [
                  FileCheck2,
                  "Prévia antes do final",
                  "Confira o conteúdo antes de gerar o documento.",
                ],
                [
                  Smartphone,
                  "Do celular ao PDF",
                  "Faça o processo inteiro em uma interface responsiva.",
                ],
                [
                  ShieldCheck,
                  "Seus documentos na sua conta",
                  "Autenticação e regras de acesso protegem a sua biblioteca.",
                ],
              ].map(([Icon, title, body]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <div key={String(title)} className="flex gap-4">
                    <I className="mt-1 size-6 shrink-0 text-emerald-700" />
                    <div>
                      <h3 className="font-bold text-slate-900">{String(title)}</h3>
                      <p className="mt-1 leading-6 text-slate-600">{String(body)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
            <Sparkles className="size-8 text-emerald-800" />
            <h2 className="mt-5 text-2xl font-extrabold text-slate-950">
              Uma opção gratuita para começar
            </h2>
            <p className="mt-4 leading-7 text-slate-700">
              Com uma conta, você pode gerar uma vez por mês um dos modelos marcados como gratuitos.
              O PDF dessa modalidade inclui marca d’água.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Catálogo aberto para consulta",
                "Conta necessária para salvar e gerar",
                "Condições mostradas antes da conclusão",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />
                  <span className="text-slate-800">{x}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/documentos"
              className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-emerald-800 px-6 font-bold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:ring-2 focus-visible:ring-emerald-700"
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
          <h2 className="mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            Antes de começar, vale saber
          </h2>
          <div className="mt-8 divide-y divide-slate-200">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-5 font-bold text-slate-950 transition hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded-lg py-1">
                  <span>{q}</span>
                  <span
                    className="text-2xl text-blue-900 transition-transform group-open:rotate-45 select-none"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-3xl pb-2 pr-8 leading-7 text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-4 py-16 text-center sm:px-6 lg:py-24">
        <div className="mx-auto max-w-3xl rounded-3xl bg-amber-50 p-7 sm:p-12">
          <div
            className="mx-auto grid size-14 place-items-center rounded-full bg-amber-200 text-3xl select-none"
            aria-hidden="true"
          >
            🦉
          </div>
          <h2 className="mt-5 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            Seu documento pode começar com uma pergunta simples
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
            Conte o que você precisa resolver e encontre o modelo certo para preencher no seu ritmo.
          </p>
          <Link
            href="/documentos"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-900 px-6 font-bold text-white shadow-sm transition hover:bg-blue-950 focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <span>Escolher um documento</span>
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
