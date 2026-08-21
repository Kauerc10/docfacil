"use client";

import { Plus, Trash2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deserializeMoradoresAutorizados,
  serializeMoradoresAutorizados,
  type MoradorAutorizado,
} from "@/lib/document-engine";
import type { CampoModelo } from "@/lib/types";
import { aplicarMascara } from "./types";

interface ListaPessoasProps {
  campo: CampoModelo;
  value: string;
  onChange: (value: string) => void;
  onAvancar: () => void;
  submitting?: boolean;
  erro?: string | null;
}

/** A key must not contain editable data, otherwise React remounts the input on each keystroke. */
export function getMoradorRowKey(index: number): string {
  return `morador-${index}`;
}

export function ListaPessoas({
  campo,
  value,
  onChange,
  onAvancar,
  submitting = false,
  erro = null,
}: ListaPessoasProps) {
  const moradores = deserializeMoradoresAutorizados(value);
  const maxItens = campo.listaPessoas?.maxItens ?? 4;
  const itemLabel = campo.listaPessoas?.itemLabel ?? "pessoa";

  const save = (next: MoradorAutorizado[]) =>
    onChange(serializeMoradoresAutorizados(next));

  const addMorador = () => save([...moradores, { nome: "" }]);

  const updateMorador = (
    index: number,
    field: keyof MoradorAutorizado,
    nextValue: string
  ) => {
    save(
      moradores.map((morador, currentIndex) =>
        currentIndex === index
          ? { ...morador, [field]: nextValue }
          : morador
      )
    );
  };

  if (moradores.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink/70">
          Assim o contrato deixa claro quem pode morar no imóvel junto com o inquilino.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onAvancar}
            disabled={submitting}
            className="min-h-14 rounded-xl border-2 border-[var(--blue-soft)] bg-surface px-4 text-left font-semibold text-ink transition-colors hover:border-[var(--blue-royal)] disabled:opacity-60"
          >
            Não, só o inquilino
          </button>
          <button
            type="button"
            onClick={addMorador}
            disabled={submitting}
            className="min-h-14 rounded-xl border-2 border-[var(--blue-royal)] bg-[var(--blue-royal)] px-4 text-left font-semibold text-white transition-colors hover:bg-[var(--navy)] disabled:opacity-60"
          >
            Sim, adicionar morador
          </button>
        </div>
        {campo.microcopy && (
          <p className="pen-note text-sm pl-1 flex items-start gap-1.5">
            <span aria-hidden="true" className="text-[var(--selo-green)] mt-px">•</span>
            <span>{campo.microcopy}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {moradores.map((morador, index) => (
        <section
          key={getMoradorRowKey(index)}
          className="rounded-2xl border border-[var(--border)] bg-surface p-4 space-y-3"
          aria-label={`${itemLabel} ${index + 1}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 font-semibold text-ink">
              <UserRound className="h-4 w-4 text-[var(--blue-royal)]" aria-hidden="true" />
              {itemLabel[0]?.toUpperCase()}{itemLabel.slice(1)} {index + 1}
            </p>
            <button
              type="button"
              onClick={() => save(moradores.filter((_, currentIndex) => currentIndex !== index))}
              disabled={submitting}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[var(--coral)] hover:bg-[var(--coral)]/10 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remover
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink/75">Nome completo</span>
            <input
              value={morador.nome}
              onChange={(event) => updateMorador(index, "nome", event.target.value)}
              placeholder="Ex: Maria Aparecida da Silva"
              autoComplete="name"
              disabled={submitting}
              className={cn(
                "h-12 w-full rounded-xl border-2 bg-white px-4 text-base outline-none transition-all placeholder:text-ink/40 disabled:opacity-60",
                erro && !morador.nome.trim()
                  ? "border-[var(--coral)]"
                  : "border-[var(--blue-soft)] focus:border-[var(--blue-royal)]"
              )}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink/75">CPF <span className="font-normal">(opcional)</span></span>
            <input
              value={morador.cpf ?? ""}
              onChange={(event) =>
                updateMorador(index, "cpf", aplicarMascara(event.target.value, "cpf"))
              }
              placeholder="Ex: 123.456.789-00"
              inputMode="numeric"
              autoComplete="off"
              disabled={submitting}
              className="h-12 w-full rounded-xl border-2 border-[var(--blue-soft)] bg-white px-4 text-base outline-none transition-all placeholder:text-ink/40 focus:border-[var(--blue-royal)] disabled:opacity-60"
            />
          </label>
        </section>
      ))}

      {moradores.length < maxItens && (
        <button
          type="button"
          onClick={addMorador}
          disabled={submitting}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 font-semibold text-[var(--blue-royal)] hover:bg-[var(--blue-soft)]/50 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar outra pessoa
        </button>
      )}

      {erro && <p role="alert" className="text-sm font-medium text-[var(--coral)]">{erro}</p>}

      <button
        type="button"
        onClick={onAvancar}
        disabled={submitting}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--blue-royal)] px-6 font-semibold text-white transition-colors hover:bg-[var(--navy)] disabled:opacity-60"
      >
        Continuar
      </button>
    </div>
  );
}
