import type { Metadata } from "next";
import Link from "next/link";
import { hashToken } from "@/lib/server/domain/documents";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { DownloadButton } from "./download-button";
import { FileText, ShieldAlert, CheckCircle2, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Download de Documento Seguro | DocFacil",
  description: "Acesse e baixe seu documento em PDF com segurança.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
  referrer: "no-referrer",
};

export default async function SharedDocumentPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  const tokenHash = hashToken(token);

  const repos = getRepositories();
  const link = await repos.access.getAccessLink(tokenHash);

  if (!link || !link.active) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-950/50 border border-red-800/50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Link Indisponível</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Este link de acesso é inválido ou foi revogado pelo emissor do documento.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Voltar para o DocFacil
          </Link>
        </div>
      </main>
    );
  }

  const doc = await repos.documents.getDocument(link.documentId);
  const artifact = await repos.documents.getArtifact(link.documentId, link.version);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Documento Seguro
              </span>
              <h1 className="text-lg font-bold text-white leading-tight">
                {doc?.modeloNome || "Documento em PDF"}
              </h1>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Versão:</span>
              <span className="text-slate-200 font-medium">v{link.version}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tipo de acesso:</span>
              <span className="text-slate-200 font-medium">
                {link.kind === "guest" ? "Magic Link Permanente" : "Link Compartilhado"}
              </span>
            </div>
            {artifact && (
              <div className="flex justify-between text-slate-400">
                <span>Tamanho:</span>
                <span className="text-slate-200 font-medium">
                  {(artifact.sizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Armazenamento privado e link assinado de uso seguro.</span>
          </div>
        </div>

        <DownloadButton token={token} filename={artifact?.filename || "documento.pdf"} />

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Gerado via <span className="text-slate-400 font-medium">DocFacil</span>
          </p>
        </div>
      </div>
    </main>
  );
}
