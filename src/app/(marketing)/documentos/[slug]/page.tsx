import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock, FileText, ShieldAlert } from "lucide-react";
import { PUBLIC_MODELS } from "@/lib/catalog/public-models";
import { COMPANY } from "@/lib/company";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PUBLIC_MODELS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = PUBLIC_MODELS.find((x) => x.slug === slug);
  if (!m) return {};

  return {
    title: `${m.nome} | ${COMPANY.productName}`,
    description: m.descricao,
    alternates: { canonical: `/documentos/${slug}` },
    openGraph: {
      title: `${m.nome} | ${COMPANY.productName}`,
      description: m.descricao,
      url: `${COMPANY.url}/documentos/${slug}`,
      type: "article",
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const m = PUBLIC_MODELS.find((x) => x.slug === slug);
  if (!m) notFound();

  return (
    <article className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-28 lg:pt-32 lg:pb-20">
      <Link
        href="/documentos"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-900 transition hover:text-blue-950 focus-visible:ring-2 focus-visible:ring-blue-700"
      >
        <ArrowLeft className="size-4" /> Todos os modelos de documentos
      </Link>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-blue-50 px-3.5 py-1 text-sm font-bold text-blue-900">
            {m.categoria}
          </span>
          {m.free && (
            <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-sm font-bold text-emerald-800">
              Opção gratuita no mês
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Clock className="size-4 text-slate-400" /> Cerca de {m.minutos} min para preencher
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
          {m.nome}
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          {m.descricao}
        </p>

        <div className="mt-10 border-t border-slate-100 pt-8">
          <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">Quando usar este modelo</h2>
          <p className="mt-3 text-base leading-7 text-slate-700">{m.quandoUsar}</p>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-50 p-6 sm:p-7">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <FileText className="size-5 text-blue-900" />
            O que você terá neste documento
          </h3>
          <ul className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {[
              "Perguntas guiadas em linguagem clara",
              "Conferência dos dados antes de gerar o PDF",
              "Documento pronto para baixar, assinar e imprimir",
              "Interface pensada para uso confortável pelo celular",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-950">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-800" />
          <p>
            O DocFácil ajuda a estruturar as informações no modelo escolhido. Não substitui
            aconselhamento jurídico individualizado para casos de litígio ou complexidade, nem
            atos que exijam escritura pública ou serviços notariais em cartório.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href={`/?view=criar&slug=${m.slug}`}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-7 text-base font-bold text-white shadow-sm transition hover:bg-blue-950 focus-visible:ring-2 focus-visible:ring-blue-700 sm:w-auto"
          >
            <span>Começar este documento</span>
            <ArrowRight className="size-5" />
          </Link>
          <Link
            href="/documentos"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-700 sm:w-auto"
          >
            Ver outros modelos
          </Link>
        </div>
      </div>
    </article>
  );
}
