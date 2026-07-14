"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Selo } from "../../selo";

const LINHAS_POR_PAGINA = 20;
const CHARS_POR_LINHA = 78;

type TipoLinha = "heading1" | "heading2" | "paragraph" | "signature" | "witness";

interface LinhaRenderizada {
  tipo: TipoLinha;
  texto: string;
}

export interface DetalhePreviewProps {
  /** id do documento salvo (exibido no header da 1ª página) */
  docId: string;
  titulo: string;
  /** corpo do modelo — cada item é uma linha do template com `{{key}}` */
  corpo: string[];
  /** respostas salvas no Firestore/localStorage */
  respostas: Record<string, string>;
  /** cláusulas dinâmicas selecionadas: id → corpo */
  clausulas?: Record<string, string>;
  /** chaves dos campos opcionais (vazios viram "" em vez de "_____") */
  camposOpcionais?: string[];
  /** classe extra no root */
  className?: string;
  /** quando true, mostra o selo marca d'água no fundo de cada página */
  showWatermark?: boolean;
}

/**
 * DetalhePreview — prévia A4 paginada com flip 3D CSS para a tela de
 * detalhe do documento salvo.
 *
 * Mesma engine de paginação/formatatação da PreviewA4 (criar-view), mas
 * otimizada pra um documento já preenchido:
 *  - Sem badge "ao vivo" (não é mais um draft ativo)
 *  - Header da 1ª página mostra o docId
 *  - Footer em cada página com "DocFacil · pág. X/Y"
 *  - fillTemplate trata `{{key}}`, `{{clausula:id}}` e campos opcionais
 *    (campos vazios opcionais viram string vazia; obrigatórios viram
 *    "______________________")
 */
export function DetalhePreview({
  docId,
  titulo,
  corpo,
  respostas,
  clausulas = {},
  camposOpcionais = [],
  className,
  showWatermark = true,
}: DetalhePreviewProps) {
  const [pagina, setPagina] = useState(0);

  const linhasRenderizadas = useMemo<LinhaRenderizada[]>(() => {
    const saida: LinhaRenderizada[] = [];
    saida.push({ tipo: "heading1", texto: titulo });
    for (const linha of corpo) {
      const renderizada = fillTemplate(linha, respostas, clausulas, camposOpcionais);
      const trimmed = renderizada.trim();
      if (trimmed.startsWith("## ")) {
        saida.push({ tipo: "heading2", texto: trimmed.slice(3) });
      } else if (
        trimmed.startsWith("[ASSINATURA]") ||
        /assinatura\s*:/i.test(trimmed)
      ) {
        saida.push({
          tipo: "signature",
          texto: trimmed.replace(/^\[ASSINATURA\]\s*/, ""),
        });
      } else if (
        trimmed.startsWith("[TESTEMUNHA]") ||
        /testemunha/i.test(trimmed)
      ) {
        saida.push({
          tipo: "witness",
          texto: trimmed.replace(/^\[TESTEMUNHA\]\s*/, ""),
        });
      } else if (trimmed.startsWith("# ")) {
        saida.push({ tipo: "heading1", texto: trimmed.slice(2) });
      } else {
        saida.push({ tipo: "paragraph", texto: renderizada });
      }
    }
    return saida;
  }, [titulo, corpo, respostas, clausulas, camposOpcionais]);

  const linhasQuebradas = useMemo<string[]>(() => {
    const todas: string[] = [];
    for (const l of linhasRenderizadas) {
      if (l.tipo === "heading1" || l.tipo === "heading2") {
        todas.push(`__${l.tipo}__${l.texto}`);
        continue;
      }
      const prefixo = `__${l.tipo}__`;
      const palavras = l.texto.split(/\s+/).filter(Boolean);
      let atual = "";
      for (const p of palavras) {
        if ((atual + " " + p).trim().length > CHARS_POR_LINHA) {
          if (atual) todas.push(prefixo + atual.trim());
          atual = p;
        } else {
          atual = (atual + " " + p).trim();
        }
      }
      if (atual.trim()) todas.push(prefixo + atual.trim());
      else if (palavras.length === 0) todas.push(prefixo);
    }
    return todas;
  }, [linhasRenderizadas]);

  const paginas = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < linhasQuebradas.length; i += LINHAS_POR_PAGINA) {
      out.push(linhasQuebradas.slice(i, i + LINHAS_POR_PAGINA));
    }
    if (out.length === 0) out.push([]);
    return out;
  }, [linhasQuebradas]);

  const total = paginas.length;
  if (pagina > total - 1) {
    setTimeout(() => setPagina(Math.max(0, total - 1)), 0);
  }
  const paginaAtual = Math.min(pagina, total - 1);

  const irAnterior = () => setPagina((p) => Math.max(0, p - 1));
  const irProxima = () => setPagina((p) => Math.min(total - 1, p + 1));

  return (
    <div className={cn("relative", className)}>
      <div
        className="relative w-full aspect-[1/1.414] mx-auto"
        style={{ perspective: "1400px" }}
      >
        <div
          className="relative w-full h-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {paginas.map((linhas, idx) => {
            const ativa = idx === paginaAtual;
            const isPast = idx < paginaAtual;
            return (
              <div
                key={idx}
                aria-hidden={!ativa}
                className={cn(
                  "absolute inset-0 transition-all duration-700 ease-out",
                  ativa ? "opacity-100 z-10" : "opacity-0 -z-10"
                )}
                style={{
                  transform: ativa
                    ? "rotateY(0deg)"
                    : isPast
                    ? "rotateY(-90deg)"
                    : "rotateY(90deg)",
                  transformOrigin: "left center",
                  backfaceVisibility: "hidden",
                }}
              >
                <DetalhePagina
                  linhas={linhas}
                  showWatermark={showWatermark}
                  docId={docId}
                  numeroPagina={idx + 1}
                  totalPaginas={total}
                />
              </div>
            );
          })}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={irAnterior}
              disabled={paginaAtual === 0}
              aria-label="Página anterior"
              className="absolute left-1 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-surface/95 border border-[var(--border)] shadow-md text-ink/70 hover:text-[var(--blue-royal)] hover:border-[var(--blue-royal)]/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={irProxima}
              disabled={paginaAtual === total - 1}
              aria-label="Próxima página"
              className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-surface/95 border border-[var(--border)] shadow-md text-ink/70 hover:text-[var(--blue-royal)] hover:border-[var(--blue-royal)]/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {paginas.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPagina(idx)}
              aria-label={`Ir para página ${idx + 1}`}
              aria-current={idx === paginaAtual}
              className={cn(
                "transition-all rounded-full",
                idx === paginaAtual
                  ? "w-6 h-2 bg-[var(--blue-royal)]"
                  : "w-2 h-2 bg-ink/20 hover:bg-ink/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DetalhePagina({
  linhas,
  showWatermark,
  docId,
  numeroPagina,
  totalPaginas,
}: {
  linhas: string[];
  showWatermark: boolean;
  docId: string;
  numeroPagina: number;
  totalPaginas: number;
}) {
  return (
    <div className="relative w-full h-full bg-white rounded-sm shadow-[0_18px_44px_-20px_rgba(14,35,64,0.35),0_2px_8px_-4px_rgba(14,35,64,0.18)] overflow-hidden ring-1 ring-black/5">
      {showWatermark && <Selo variant="watermark" />}

      <div className="relative h-full px-7 sm:px-9 py-8 sm:py-10 flex flex-col">
        {numeroPagina === 1 && (
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-ink/45">
            DocFacil · ID {docId}
          </p>
        )}

        <div className="flex-1 space-y-2.5 overflow-hidden mt-3">
          {linhas.map((linha, i) => {
            const match = linha.match(/^__(\w+)__(.*)$/);
            const tipo = (match?.[1] as TipoLinha) || "paragraph";
            const texto = match?.[2] ?? linha;
            return <Linha key={i} tipo={tipo} texto={texto} />;
          })}
        </div>

        <div className="mt-3 pt-2 border-t border-ink/10 flex items-center justify-between text-[0.55rem] text-ink/40 uppercase tracking-wider">
          <span>DocFacil</span>
          <span>
            pág. {numeroPagina}/{totalPaginas}
          </span>
        </div>
      </div>
    </div>
  );
}

function Linha({ tipo, texto }: { tipo: TipoLinha; texto: string }) {
  switch (tipo) {
    case "heading1":
      return (
        <p className="font-[family-name:var(--font-jakarta)] text-base sm:text-lg font-extrabold text-[var(--navy)] uppercase tracking-tight text-center leading-tight">
          {texto}
        </p>
      );
    case "heading2":
      return (
        <p className="font-[family-name:var(--font-jakarta)] text-xs sm:text-sm font-bold text-ink uppercase tracking-wide leading-tight">
          {texto}
        </p>
      );
    case "signature":
      return (
        <p className="font-mono text-[11px] sm:text-[13px] text-ink/85 leading-relaxed">
          {texto}
        </p>
      );
    case "witness":
      return (
        <p className="italic text-[11px] sm:text-[13px] text-ink/75 leading-relaxed text-pretty">
          {texto}
        </p>
      );
    case "paragraph":
    default:
      return (
        <p className="text-[11px] sm:text-[13px] leading-relaxed text-ink/85 text-justify text-pretty">
          {texto}
        </p>
      );
  }
}

/**
 * Substitui `{{key}}` e `{{clausula:id}}` no template.
 * - Campos opcionais vazios viram "" (string vazia).
 * - Outros campos vazios viram "______________________".
 * - `{{clausula:id}}` vira o corpo da cláusula quando ela está em `clausulas`,
 *   ou "" quando não está (cláusula não selecionada).
 */
function fillTemplate(
  template: string,
  respostas: Record<string, string>,
  clausulas: Record<string, string>,
  camposOpcionais: string[]
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key: string) => {
    const k = key.trim();
    if (k.startsWith("clausula:")) {
      const id = k.slice("clausula:".length);
      return clausulas[id] ?? "";
    }
    const valor = respostas[k];
    if (valor && valor.trim()) return valor;
    if (camposOpcionais.includes(k)) return "";
    return "______________________";
  });
}
