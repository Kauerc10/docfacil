"use client";

import { useEffect, useMemo, useState } from "react";
import type { Modelo } from "@/lib/types";
import { encodeClausulasSelecionadas } from "@/lib/document-engine/compose";
import { buildDocDefinition } from "@/lib/pdf/styles";
import { loadPdfmake } from "@/lib/pdf/loader";
import { cn } from "@/lib/utils";

interface PdfDocumentPreviewProps {
  modelo: Modelo;
  respostas?: Record<string, string>;
  clausulasSelecionadas?: string[];
  extrasPorClausula?: Record<string, Record<string, string>>;
  watermark?: boolean;
  className?: string;
}

const EMPTY_ANSWERS: Record<string, string> = {};
const EMPTY_CLAUSES: string[] = [];
const EMPTY_EXTRAS: Record<string, Record<string, string>> = {};

function buildPreviewAnswers(
  respostas: Record<string, string>,
  clausulasSelecionadas: string[],
  extrasPorClausula: Record<string, Record<string, string>>
) {
  const next = {
    ...respostas,
    ...encodeClausulasSelecionadas(clausulasSelecionadas),
  };

  for (const clausulaId of clausulasSelecionadas) {
    Object.assign(next, extrasPorClausula[clausulaId] ?? {});
  }

  return next;
}

export function PdfDocumentPreview({
  modelo,
  respostas = EMPTY_ANSWERS,
  clausulasSelecionadas = EMPTY_CLAUSES,
  extrasPorClausula = EMPTY_EXTRAS,
  watermark = false,
  className,
}: PdfDocumentPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [error, setError] = useState(false);

  const previewAnswers = useMemo(
    () => buildPreviewAnswers(respostas, clausulasSelecionadas, extrasPorClausula),
    [respostas, clausulasSelecionadas, extrasPorClausula]
  );

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;

    setPdfUrl(undefined);
    setError(false);

    void (async () => {
      try {
        const pdfmake = await loadPdfmake();
        const pdf = pdfmake.createPdf(
          buildDocDefinition(modelo, previewAnswers, { watermark })
        );
        const blob = await pdf.getBlob();

        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch {
        if (active) setError(true);
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [modelo, previewAnswers, watermark]);

  if (error) {
    return (
      <div
        role="status"
        className={cn(
          "grid aspect-[1/1.414] place-items-center rounded-md bg-white px-6 text-center text-sm text-ink/60 shadow-sm ring-1 ring-black/5",
          className
        )}
      >
        A prévia não carregou agora. O PDF final continua disponível normalmente.
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div
        role="status"
        aria-label="Preparando prévia em PDF"
        className={cn(
          "aspect-[1/1.414] animate-pulse rounded-md bg-white shadow-[0_16px_36px_-20px_rgba(14,35,64,0.28)] ring-1 ring-black/5",
          className
        )}
      />
    );
  }

  return (
    <iframe
      title={`Prévia em PDF — ${modelo.nome}`}
      src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
      loading="lazy"
      className={cn(
        "block aspect-[1/1.414] w-full rounded-md bg-white shadow-[0_16px_36px_-20px_rgba(14,35,64,0.32)] ring-1 ring-black/5",
        className
      )}
    />
  );
}
