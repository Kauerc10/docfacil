"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Clock, ArrowRight, X, Sparkles } from "lucide-react";
import type { PublicModel } from "@/lib/catalog/search";
import { searchPublicModels } from "@/lib/catalog/search";

type DocumentCatalogProps = {
  models: PublicModel[];
  initialQuery?: string;
  initialCategory?: string;
};

export function DocumentCatalog({
  models,
  initialQuery = "",
  initialCategory = "Todos",
}: DocumentCatalogProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [freeOnly, setFreeOnly] = useState(false);

  const categories = useMemo(() => ["Todos", ...new Set(models.map((m) => m.categoria))], [models]);

  const results = useMemo(() => {
    let list = searchPublicModels(models, query);
    if (category !== "Todos") {
      list = list.filter((m) => m.categoria === category);
    }
    if (freeOnly) {
      list = list.filter((m) => m.free);
    }
    return list;
  }, [models, query, category, freeOnly]);

  const handleClearFilters = () => {
    setQuery("");
    setCategory("Todos");
    setFreeOnly(false);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-2xl">
          <span className="sr-only">Buscar um documento</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: aluguel, procuração, residência ou compra e venda"
            className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-10 text-base shadow-sm outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar campo de busca"
              className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-700"
            >
              <X className="size-4" />
            </button>
          )}
        </label>

        <button
          type="button"
          aria-pressed={freeOnly}
          onClick={() => setFreeOnly((prev) => !prev)}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition sm:shrink-0 ${
            freeOnly
              ? "bg-emerald-800 text-white shadow-sm"
              : "border border-emerald-300 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100"
          }`}
        >
          <Sparkles className="size-4" />
          Opções gratuitas no mês
        </button>
      </div>

      <div
        className="my-5 flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        aria-label="Filtrar por categoria"
        role="toolbar"
      >
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-blue-700 ${
              category === item
                ? "bg-blue-900 text-white shadow-sm"
                : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="mb-6 text-sm text-slate-600" aria-live="polite">
        {results.length === 1
          ? "1 documento encontrado"
          : `${results.length} documentos encontrados`}
      </p>

      {results.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {results.map((m) => (
            <article
              key={m.slug}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">
                    {m.categoria}
                  </span>
                  {m.free && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      Grátis no mês
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-950">{m.nome}</h2>
                <p className="mt-2.5 text-sm leading-6 text-slate-600">{m.descricao}</p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Clock className="size-4" /> Cerca de {m.minutos} min
                </p>
                <Link
                  href={`/documentos/${m.slug}`}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-between rounded-xl bg-slate-100 px-4 font-semibold text-blue-950 transition hover:bg-blue-900 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  <span>Ver detalhes e requisitos</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-bold text-slate-900">Nenhum documento encontrado.</p>
          <p className="mt-2 text-sm text-slate-600">
            Tente buscar com outros termos ou limpe os filtros para ver todas as opções disponíveis.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-900 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-950 focus-visible:ring-2 focus-visible:ring-blue-700"
            onClick={handleClearFilters}
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
