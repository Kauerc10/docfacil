"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface DownloadButtonProps {
  token: string;
  filename: string;
}

export function DownloadButton({ token, filename }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/access/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Falha ao obter link de download.");
      }

      const data = await res.json();
      if (data.downloadUrl) {
        // Redireciona diretamente para o link assinado de download
        window.location.href = data.downloadUrl;
      }
    } catch (err: any) {
      setError(err.message || "Não foi possível baixar o documento no momento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl text-red-300 text-xs">
          {error}
        </div>
      )}
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Preparando download seguro...</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Baixar {filename}</span>
          </>
        )}
      </button>
    </div>
  );
}
