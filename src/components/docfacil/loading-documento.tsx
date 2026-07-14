"use client";

import { Pet } from "./pet";

/**
 * LoadingDocumento — tela de loading animada que aparece entre o
 * preenchimento do documento e a tela de sucesso.
 * O pet fica "pensando" enquanto uma barra de progresso animada aparece.
 */
export function LoadingDocumento({ nomeModelo }: { nomeModelo?: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-paper p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <Pet mood="pensando" size={100} />
        <div className="space-y-2">
          <h2 className="font-[family-name:var(--font-jakarta)] text-xl sm:text-2xl font-bold text-ink">
            Preparando seu documento...
          </h2>
          {nomeModelo && <p className="text-ink/60 text-sm">{nomeModelo}</p>}
        </div>
        <div className="w-48 h-1.5 bg-[var(--blue-soft)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--selo-green)] rounded-full" style={{ animation: "loadingProgress 1.5s ease-out forwards" }} />
        </div>
        <style>{`@keyframes loadingProgress { 0% { width: 0%; } 100% { width: 100%; } }`}</style>
      </div>
    </div>
  );
}
