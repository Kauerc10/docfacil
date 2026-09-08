"use client";

import { useState } from "react";
import { FileText, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Pet } from "@/components/docfacil/pet";

export function HeroScene() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative mx-auto w-full max-w-lg lg:max-w-none select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-hidden="true"
    >
      {/* Camadas de papéis/documentos físicos em profundidade (atrás do card principal) */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {/* Folha 3 (mais ao fundo, inclinada à direita) */}
        <div
          className="absolute -right-3 -top-5 sm:-right-6 sm:-top-7 h-[105%] w-full rounded-2xl sm:rounded-3xl border border-slate-300/60 bg-white/70 shadow-sm rotate-[5.5deg] transition-transform duration-500 ease-out"
          style={{
            transform: isHovered ? "rotate(7deg) translate(8px, -4px)" : undefined,
          }}
        >
          {/* Linhas decorativas simulando cabeçalho de contrato timbrado */}
          <div className="p-6 space-y-2.5 opacity-30">
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-32 rounded bg-slate-400" />
              <div className="size-6 rounded-full bg-slate-300" />
            </div>
            <div className="h-1.5 w-48 rounded bg-slate-300" />
            <div className="mt-4 h-1 w-full rounded bg-slate-200" />
            <div className="h-1 w-5/6 rounded bg-slate-200" />
          </div>
        </div>

        {/* Folha 2 (meio, levemente inclinada à esquerda) */}
        <div
          className="absolute -left-3 -top-3 sm:-left-5 sm:-top-4 h-[103%] w-full rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white/90 shadow-md rotate-[-2.5deg] transition-transform duration-500 ease-out"
          style={{
            transform: isHovered ? "rotate(-3.5deg) translate(-6px, -2px)" : undefined,
          }}
        >
          <div className="flex items-center justify-between p-6 opacity-40">
            <div className="space-y-1.5">
              <div className="h-2 w-28 rounded bg-blue-400" />
              <div className="h-1.5 w-36 rounded bg-slate-300" />
            </div>
            <div className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="size-3.5" />
              DocFácil
            </div>
          </div>
        </div>
      </div>

      {/* Card principal da cena (demonstração do produto real) */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-blue-200/90 bg-white p-5 sm:p-7 shadow-xl shadow-blue-950/10 transition-all duration-300 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-950/15">
        {/* Barra superior de status do documento */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">
              <FileText className="size-3.5" />
              Passo 1 de 4 • Contrato de Locação
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Rascunho seguro
          </span>
        </div>

        {/* Linha da Corujinha com balão de orientação interativo */}
        <div className="mt-5 flex items-start gap-3.5 sm:gap-4">
          <div className="relative shrink-0 pt-0.5">
            <Pet
              mood={isHovered ? "feliz" : "idle"}
              size={66}
              lookAtCursor={true}
              showDashedCircle={false}
            />
          </div>

          <div className="relative flex-1 rounded-2xl border border-amber-200/90 bg-amber-50/90 p-3 sm:p-3.5 text-slate-800 shadow-sm">
            {/* Triângulo do balão de fala apontando para a corujinha */}
            <div className="absolute -left-2 top-4 size-3 rotate-45 border-b border-l border-amber-200/90 bg-amber-50/90" />
            <p className="flex items-center gap-1 text-xs font-extrabold text-amber-950">
              <Sparkles className="size-3.5 text-amber-800" />
              Dica da Corujinha
            </p>
            <p className="mt-1 text-xs sm:text-[0.825rem] leading-relaxed text-slate-700">
              Informe o nome como consta no documento de identidade. As cláusulas legais são
              formatadas automaticamente.
            </p>
          </div>
        </div>

        {/* Bloco de Pergunta Guiada */}
        <div className="mt-5 rounded-2xl bg-slate-50/90 p-4 sm:p-5 border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-900">
            Pergunta da etapa
          </p>
          <p className="mt-1.5 text-base sm:text-lg font-extrabold text-slate-950">
            Quem é o locador do imóvel?
          </p>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Pessoa proprietária ou administradora responsável pelo imóvel.
          </p>

          {/* Campo com valor preenchido e feedback visual de validação */}
          <div className="mt-3.5 flex items-center justify-between rounded-xl border border-blue-500/50 bg-white px-3.5 py-2.5 sm:py-3 shadow-sm ring-2 ring-blue-100">
            <span className="text-sm sm:text-base font-semibold text-slate-900">
              Carlos Eduardo de Morais
            </span>
            <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs">
              <Check className="size-3.5" />
            </span>
          </div>
        </div>

        {/* Rodapé com prévia em tempo real */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <Check className="size-4 text-emerald-700" />
            Cláusula 1ª atualizada no PDF
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-800">
            Pronto para revisar
          </span>
        </div>
      </div>
    </div>
  );
}
