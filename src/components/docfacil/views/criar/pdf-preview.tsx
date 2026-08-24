"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { campoEstaVisivel, type CampoModelo, type Modelo } from "@/lib/types";
import {
  PdfPreviewSession,
  type PdfPreviewPayload,
} from "@/lib/documents/preview-client";
import type { PdfPreviewProps } from "./types";

export const PDF_PREVIEW_DEBOUNCE_MS = 600;

/** Includes extras only while their clause is selected, preventing stale data. */
export function createPdfPreviewPayload(
  modeloSlug: string,
  respostas: Record<string, string>,
  clausulasSelecionadas: string[],
  extrasPorClausula: Record<string, Record<string, string>>
): PdfPreviewPayload {
  const respostasDePreview = { ...respostas };
  for (const clausulaId of clausulasSelecionadas) {
    Object.assign(respostasDePreview, extrasPorClausula[clausulaId] ?? {});
  }

  return {
    modeloSlug,
    respostas: respostasDePreview,
    clausulasSelecionadas,
  };
}

function hasValue(respostas: Record<string, string>, campo: CampoModelo): boolean {
  return campo.obrigatorio === false || (respostas[campo.key] ?? "").trim().length > 0;
}

/** Returns whether the current local answers can produce a valid preview request. */
export function isPdfPreviewReady(
  modelo: Modelo,
  respostas: Record<string, string>,
  clausulasSelecionadas: string[]
): boolean {
  if (!modelo.campos
    .filter((campo) => campo.obrigatorio !== false && campoEstaVisivel(campo, respostas))
    .every((campo) => hasValue(respostas, campo))) {
    return false;
  }

  for (const etapa of modelo.etapas ?? []) {
    if (etapa.tipo !== "clausulas") continue;
    for (const clausula of etapa.clausulas) {
      if (!clausulasSelecionadas.includes(clausula.id)) continue;
      if (!(clausula.camposExtras ?? []).every((campo) => hasValue(respostas, campo))) {
        return false;
      }
    }
  }

  return true;
}

export function PdfPreviewFrame({ pdfUrl }: { pdfUrl: string }) {
  return (
    <iframe
      title="Prévia fiel do documento"
      src={pdfUrl}
      className="w-full aspect-[1/1.414] rounded-sm bg-white shadow-[0_20px_40px_-20px_rgba(14,35,64,0.3)] ring-1 ring-black/5"
    />
  );
}

export function PdfPreview({
  modelo,
  respostas,
  clausulasSelecionadas,
  extrasPorClausula,
  authenticated,
}: PdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const sessionRef = useRef<PdfPreviewSession | null>(null);
  if (sessionRef.current == null) {
    sessionRef.current = new PdfPreviewSession({ onUrlChange: setPdfUrl });
  }

  const payload = useMemo(
    () => createPdfPreviewPayload(modelo.slug, respostas, clausulasSelecionadas, extrasPorClausula),
    [modelo.slug, respostas, clausulasSelecionadas, extrasPorClausula]
  );
  const ready = isPdfPreviewReady(modelo, payload.respostas, payload.clausulasSelecionadas);

  useEffect(() => {
    const session = sessionRef.current!;
    return () => session.dispose();
  }, []);

  useEffect(() => {
    const session = sessionRef.current!;
    if (!authenticated) {
      session.clear();
      return;
    }

    if (!ready) {
      session.cancel();
      return;
    }

    const timer = window.setTimeout(() => {
      setError(undefined);
      void session.request(payload).catch(() => {
        setError("Não foi possível atualizar a prévia. A última versão válida continua disponível.");
      });
    }, PDF_PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      session.cancel();
    };
  }, [authenticated, payload, ready]);

  if (!authenticated) {
    return (
      <div className="w-full aspect-[1/1.414] rounded-sm bg-white/80 shadow-sm ring-1 ring-black/5 p-7 flex flex-col items-center justify-center text-center gap-3">
        <LockKeyhole aria-hidden="true" className="size-6 text-ink/55" />
        <p className="text-sm font-semibold text-ink">Entre para ver a prévia fiel em PDF.</p>
        <p className="text-xs text-ink/60">Você pode continuar preenchendo este formulário.</p>
      </div>
    );
  }

  if (pdfUrl) {
    return (
      <div className="w-full space-y-2">
        <PdfPreviewFrame pdfUrl={pdfUrl} />
        {error && <p role="status" className="text-xs text-ink/60">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full aspect-[1/1.414] rounded-sm bg-white/80 shadow-sm ring-1 ring-black/5 p-7 flex items-center justify-center text-center">
      <p role="status" className="text-sm text-ink/65">
        {ready ? "Preparando a prévia fiel em PDF…" : "Preencha os campos obrigatórios para ver a prévia fiel em PDF."}
      </p>
    </div>
  );
}
