import type { Metadata } from "next";
import { DocumentCatalog } from "@/components/docfacil/catalog/document-catalog";
import { PUBLIC_MODELS } from "@/lib/catalog/public-models";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: `Modelos de documentos | ${COMPANY.productName}`,
  description: "Encontre contratos, declarações e procurações e preencha com orientação em cada etapa.",
  alternates: { canonical: "/documentos" },
  openGraph: {
    title: `Modelos de documentos | ${COMPANY.productName}`,
    description: "Encontre contratos, declarações e procurações e preencha com orientação em cada etapa.",
    url: `${COMPANY.url}/documentos`,
    type: "website",
  },
};

type Props = {
  searchParams?: Promise<{ busca?: string; categoria?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const resolved = searchParams ? await searchParams : {};

  return (
    <section className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 sm:pt-28 lg:pt-32 lg:pb-20">
      <p className="font-bold uppercase tracking-widest text-emerald-700">Catálogo DocFácil</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
        Qual documento você precisa resolver hoje?
      </h1>
      <p className="mb-9 mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        Busque pelo nome ou pela situação. Antes de preencher, explicamos quando usar e o que será necessário.
      </p>
      <DocumentCatalog
        models={PUBLIC_MODELS}
        initialQuery={resolved?.busca ?? ""}
        initialCategory={resolved?.categoria ?? "Todos"}
      />
    </section>
  );
}
