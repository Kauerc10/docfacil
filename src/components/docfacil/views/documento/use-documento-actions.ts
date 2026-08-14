"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  deleteDocument,
  duplicateDocument,
} from "@/lib/services/documents-service";
import {
  getDocumentDownloadUrl,
  shareDocument,
  revokeDocumentShare,
  saveGuestDraft,
  getOrCreateFinalizationRequestId,
} from "@/lib/documents/client";
import { gerarEBaixarPDF } from "@/lib/pdf/generator";
import { useNav } from "@/components/docfacil/nav-context";
import { useAuth } from "@/lib/auth-context";
import { shouldWatermark } from "@/lib/services/plan-service";
import type { Documento, Modelo } from "@/lib/types";

export type ActionLoading = "download" | "duplicate" | "delete" | "share" | "revoke" | null;

export interface UseDocumentoActionsResult {
  /** qual ação está em andamento (null = nenhuma) */
  actionLoading: ActionLoading;
  /** link de compartilhamento ativo (se gerado) */
  shareUrl: string | null;
  /** editar respostas — se Pro, permite gerar nova versão */
  handleEditar: () => void;
  /** baixar PDF — obtém signed URL do R2 com fallback */
  handleBaixarPDF: () => Promise<void>;
  /** compartilhar documento via magic link revogável */
  handleCompartilhar: () => Promise<string | null>;
  /** revogar compartilhamento ativo */
  handleRevogarCompartilhamento: () => Promise<void>;
  /** duplicar — clona o doc via service, navega para dashboard */
  handleDuplicar: () => Promise<void>;
  /** excluir — coordena revogação, deleção R2 e Firestore */
  handleExcluir: () => Promise<void>;
  /** setter direto (para limpar ou forçar) */
  setActionLoading: (v: ActionLoading) => void;
}

export function useDocumentoActions(
  doc: Documento | null,
  modelo: Modelo | null
): UseDocumentoActionsResult {
  const { navigate } = useNav();
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleEditar = useCallback(() => {
    if (!doc) return;
    navigate("criar", { slug: doc.modeloSlug, id: doc.id });
  }, [doc, navigate]);

  const handleBaixarPDF = useCallback(async () => {
    if (!doc) return;
    setActionLoading("download");
    try {
      if (doc.id.startsWith("demo-")) {
        if (!modelo) throw new Error("Modelo não encontrado.");
        await gerarEBaixarPDF(modelo, doc.respostas, doc.modeloSlug, {
          watermark: shouldWatermark(user),
        });
      } else {
        const { downloadUrl } = await getDocumentDownloadUrl(doc.id);
        window.location.href = downloadUrl;
      }
      toast.success("Download iniciado!", {
        description: `${doc.modeloNome} pronto para visualização e impressão.`,
      });
    } catch (e: any) {
      console.error("[useDocumentoActions] erro ao baixar PDF:", e);
      toast.error("Não foi possível baixar o PDF. Tente novamente.");
    } finally {
      setActionLoading(null);
    }
  }, [doc, modelo, user]);

  const handleCompartilhar = useCallback(async (): Promise<string | null> => {
    if (!doc) return null;
    setActionLoading("share");
    try {
      const data = await shareDocument(doc.id);
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      }
      toast.success("Link de compartilhamento gerado!", {
        description: "O link foi copiado para sua área de transferência.",
      });
      return fullUrl;
    } catch (e: any) {
      console.error("[useDocumentoActions] erro ao compartilhar:", e);
      toast.error(e.message || "Erro ao gerar link de compartilhamento.");
      return null;
    } finally {
      setActionLoading(null);
    }
  }, [doc]);

  const handleRevogarCompartilhamento = useCallback(async () => {
    if (!doc) return;
    setActionLoading("revoke");
    try {
      await revokeDocumentShare(doc.id);
      setShareUrl(null);
      toast.success("Compartilhamento revogado com sucesso.");
    } catch (e: any) {
      console.error("[useDocumentoActions] erro ao revogar:", e);
      toast.error("Erro ao revogar compartilhamento.");
    } finally {
      setActionLoading(null);
    }
  }, [doc]);

  const handleDuplicar = useCallback(async () => {
    if (!doc) return;
    setActionLoading("duplicate");
    try {
      const draft = await duplicateDocument(doc.id);
      if (draft) {
        const requestId = getOrCreateFinalizationRequestId(draft.modeloSlug);
        saveGuestDraft(draft.modeloSlug, {
          requestId,
          modeloSlug: draft.modeloSlug,
          answers: draft.respostas,
          stepIndex: 0,
          clausulasSelecionadas: draft.clausulasSelecionadas || [],
          extrasPorClausula: draft.extrasPorClausula || {},
        });
        toast.success("Documento duplicado!", {
          description: "Respostas carregadas no formulário para você revisar e gerar.",
        });
        navigate("criar", { slug: draft.modeloSlug });
      } else {
        toast.error("Não foi possível duplicar o documento.");
        setActionLoading(null);
      }
    } catch (e) {
      console.error("[useDocumentoActions] erro ao duplicar:", e);
      toast.error("Erro ao duplicar documento.");
      setActionLoading(null);
    }
  }, [doc, navigate]);

  const handleExcluir = useCallback(async () => {
    if (!doc) return;
    setActionLoading("delete");
    try {
      await deleteDocument(doc.id);
      toast.success("Documento excluído.");
      navigate("dashboard");
    } catch (e) {
      console.error("[useDocumentoActions] erro ao excluir:", e);
      toast.error("Erro ao excluir documento.");
      setActionLoading(null);
    }
  }, [doc, navigate]);

  return {
    actionLoading,
    shareUrl,
    handleEditar,
    handleBaixarPDF,
    handleCompartilhar,
    handleRevogarCompartilhamento,
    handleDuplicar,
    handleExcluir,
    setActionLoading,
  };
}
