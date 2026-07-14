"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  deleteDocument,
  duplicateDocument,
} from "@/lib/services/documents-service";
import { gerarEBaixarPDF } from "@/lib/pdf/generator";
import { useNav } from "@/components/docfacil/nav-context";
import type { Documento, Modelo } from "@/lib/types";

export type ActionLoading = "download" | "duplicate" | "delete" | null;

export interface UseDocumentoActionsResult {
  /** qual ação está em andamento (null = nenhuma) */
  actionLoading: ActionLoading;
  /** editar respostas — navega para /criar com o slug do modelo */
  handleEditar: () => void;
  /** baixar PDF — gera via pdfmake e dispara download */
  handleBaixarPDF: () => Promise<void>;
  /** duplicar — clona o doc via service, navega para dashboard */
  handleDuplicar: () => Promise<void>;
  /** excluir — assume que a confirmação já foi feita pela UI consumidora
   *  (AlertDialog). Deleta via service e navega para dashboard. */
  handleExcluir: () => Promise<void>;
  /** setter direto (para limpar ou forçar) */
  setActionLoading: (v: ActionLoading) => void;
}

/**
 * useDocumentoActions — hook com handlers para a tela de detalhe do documento.
 *
 * Centraliza as 4 ações (Editar / Baixar PDF / Duplicar / Excluir) que antes
 * viviam inline no documento-detalhe-view. Mantém o estado `actionLoading`
 * único (só uma ação por vez) e dispara toasts de sucesso/erro via sonner.
 *
 * A confirmação da exclusão (AlertDialog) fica a cargo da view consumidora —
 * ela chama `handleExcluir` no `onClick` do botão de confirmar. Isso mantém
 * o hook agnóstico a UI (sem JSX embutido) e permite reuso em outras telas
 * (ex.: dashboard) sem replicar a dialog.
 */
export function useDocumentoActions(
  doc: Documento | null,
  modelo: Modelo | null
): UseDocumentoActionsResult {
  const { navigate } = useNav();
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);

  const handleEditar = useCallback(() => {
    if (!doc) return;
    navigate("criar", { slug: doc.modeloSlug });
  }, [doc, navigate]);

  const handleBaixarPDF = useCallback(async () => {
    if (!doc) return;
    if (!modelo) {
      toast.error("Modelo não encontrado para gerar o PDF.");
      return;
    }
    setActionLoading("download");
    try {
      await gerarEBaixarPDF(modelo, doc.respostas, doc.modeloSlug);
      toast.success("PDF gerado!", {
        description: `${modelo.nome} está pronto para impressão.`,
      });
    } catch (e) {
      console.error("[useDocumentoActions] erro ao gerar PDF:", e);
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setActionLoading(null);
    }
  }, [doc, modelo]);

  const handleDuplicar = useCallback(async () => {
    if (!doc) return;
    setActionLoading("duplicate");
    try {
      const novo = await duplicateDocument(doc.id);
      if (novo) {
        toast.success("Documento duplicado!", {
          description: "A cópia foi salva como rascunho.",
        });
        navigate("dashboard");
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
    handleEditar,
    handleBaixarPDF,
    handleDuplicar,
    handleExcluir,
    setActionLoading,
  };
}
