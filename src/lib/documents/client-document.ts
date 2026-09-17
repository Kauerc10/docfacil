/**
 * ClientDocument — Módulo profundo para o ciclo de vida de documentos no client.
 *
 * Encapsula:
 * - Estrutura unificada de rascunhos (ClientDraft) independente de modo guest ou conta
 * - Compilação autoritativa de respostas para prévias e finalização (compileDraftAnswers)
 * - Carregamento de sessão por ordem de precedência (loadSessionDraft)
 * - Persistência e limpeza unificada (saveClientDraft / deleteClientDraft)
 * - Orquestração de finalização com idempotência e limpeza atômica (finalizeClientDraft)
 */

import {
  getOrCreateFinalizationRequestId,
  clearFinalizationRequestId,
  clearFinalizationRequestIdByRequestId,
  shouldPreserveFinalizationRequestId,
} from "./idempotency";
import {
  saveGuestDraft as saveGuestDraftRaw,
  loadGuestDraft as loadGuestDraftRaw,
  clearGuestDraft as clearGuestDraftRaw,
  saveAccountDraft as saveAccountDraftRaw,
  getAccountDraft as getAccountDraftRaw,
  deleteAccountDraft as deleteAccountDraftRaw,
  finalizeDocument as finalizeDocumentRaw,
  createDocumentVersion as createDocumentVersionRaw,
  duplicateDocumentApi,
} from "./client";

export interface ClientDraft {
  id?: string;
  modeloSlug: string;
  sourceDocumentId?: string;
  respostas: Record<string, string>;
  stepIndex: number;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
  guestContact?: { email?: string; phone?: string };
  updatedAt?: number;
}

export interface CompileAnswersInput {
  respostas?: Record<string, string>;
  answers?: Record<string, string>;
  clausulasSelecionadas?: string[];
  extrasPorClausula?: Record<string, Record<string, string>>;
}

export interface LoadSessionDraftParams {
  slug: string;
  requestedDraftId?: string;
  requestedDocumentId?: string;
  user?: { uid: string } | null;
  /** Injeção para testes ou adaptadores de duplicação */
  duplicateFetcher?: (documentId: string) => Promise<any>;
}

export interface FinalizeClientDraftParams {
  draft: ClientDraft;
  orderId?: string;
  user?: { uid: string } | null;
  /** Injeção de dependência para testes */
  finalizer?: (input: {
    requestId?: string;
    modeloSlug: string;
    respostas: Record<string, string>;
    clausulasSelecionadas?: string[];
    guestContact?: { email?: string; phone?: string };
    orderId?: string;
  }) => Promise<{
    document: {
      id: string;
      version: number;
      artifactState: string;
      guestAccessToken?: string;
      guestAccessPath?: string;
    };
  }>;
  /** Injeção de dependência para testes */
  versionCreator?: (
    documentId: string,
    input: {
      requestId?: string;
      respostas: Record<string, string>;
      clausulasSelecionadas?: string[];
      orderId?: string;
    }
  ) => Promise<{
    document: { id: string; version: number; artifactState: string };
  }>;
}

export interface FinalizeClientDraftResult {
  document: {
    id: string;
    version: number;
    artifactState: string;
    guestAccessToken?: string;
    guestAccessPath?: string;
  };
  isNewVersion: boolean;
}

/**
 * Compila respostas e extras de cláusulas em um único dicionário pronto para
 * prévias em PDF e finalização no servidor.
 *
 * - Filtra metadados internos com prefixo `__`
 * - Se `clausulasSelecionadas` for fornecido, mescla apenas as cláusulas ativas
 * - Preserva campos JSON estruturados (como moradores adicionais)
 */
export function compileDraftAnswers(input: CompileAnswersInput): Record<string, string> {
  const result: Record<string, string> = {};
  const baseAnswers = input.respostas || input.answers || {};

  for (const [key, value] of Object.entries(baseAnswers)) {
    if (!key.startsWith("__") && typeof value === "string") {
      result[key] = value;
    }
  }

  const extrasMap = input.extrasPorClausula || {};

  if (Array.isArray(input.clausulasSelecionadas)) {
    for (const clauseId of input.clausulasSelecionadas) {
      const extras = extrasMap[clauseId];
      if (!extras) continue;
      for (const [key, value] of Object.entries(extras)) {
        if (!key.startsWith("__") && typeof value === "string") {
          result[key] = value;
        }
      }
    }
  } else {
    for (const extras of Object.values(extrasMap)) {
      if (!extras) continue;
      for (const [key, value] of Object.entries(extras)) {
        if (!key.startsWith("__") && typeof value === "string") {
          result[key] = value;
        }
      }
    }
  }

  return result;
}

/**
 * Carrega a sessão de edição/criação respeitando a ordem de precedência:
 * 1. Documento existente para criação de versão / duplicação (`requestedDocumentId`)
 * 2. Rascunho da conta autenticada (`requestedDraftId`)
 * 3. Rascunho local de convidado (guest draft via localStorage)
 */
export async function loadSessionDraft(
  params: LoadSessionDraftParams
): Promise<ClientDraft | null> {
  const { slug, requestedDraftId, requestedDocumentId, user, duplicateFetcher } = params;

  if (user && requestedDocumentId) {
    const fetcher = duplicateFetcher || duplicateDocumentApi;
    const result = await fetcher(requestedDocumentId);
    const draft = (result as { duplicateDraft?: any })?.duplicateDraft || result;
    if (!draft || draft.modeloSlug !== slug) {
      return null;
    }
    return {
      modeloSlug: draft.modeloSlug,
      sourceDocumentId: requestedDocumentId,
      respostas: draft.respostas || {},
      stepIndex: 0,
      clausulasSelecionadas: draft.clausulasSelecionadas || [],
      extrasPorClausula: draft.extrasPorClausula || {},
      updatedAt: Date.now(),
    };
  }

  if (user && requestedDraftId) {
    const draft = await getAccountDraftRaw(requestedDraftId);
    if (!draft || draft.modeloSlug !== slug) {
      return null;
    }
    return {
      id: draft.id,
      modeloSlug: draft.modeloSlug,
      sourceDocumentId: draft.sourceDocumentId,
      respostas: draft.respostas || {},
      stepIndex: Math.max(0, draft.stepIndex || 0),
      clausulasSelecionadas: draft.clausulasSelecionadas || [],
      extrasPorClausula: draft.extrasPorClausula || {},
      updatedAt: draft.updatedAt,
    };
  }

  const localDraft = loadGuestDraftRaw(slug);
  if (localDraft) {
    return {
      modeloSlug: localDraft.modeloSlug,
      respostas: localDraft.answers || {},
      stepIndex: Math.max(0, localDraft.stepIndex || 0),
      clausulasSelecionadas: localDraft.clausulasSelecionadas || [],
      extrasPorClausula: localDraft.extrasPorClausula || {},
      guestContact: localDraft.guestContact,
      updatedAt: localDraft.updatedAt,
    };
  }

  return null;
}

/**
 * Salva o rascunho atual de forma unificada:
 * - Se usuário autenticado: persiste via API no backend (/api/drafts)
 * - Se visitante: persiste no armazenamento local com chave versionada e requestId ativo
 */
export async function saveClientDraft(
  draft: Omit<ClientDraft, "updatedAt">,
  user?: { uid: string } | null
): Promise<ClientDraft> {
  const now = Date.now();

  if (user) {
    const saved = await saveAccountDraftRaw({
      draftId: draft.id,
      modeloSlug: draft.modeloSlug,
      sourceDocumentId: draft.sourceDocumentId,
      respostas: draft.respostas,
      stepIndex: draft.stepIndex,
      clausulasSelecionadas: draft.clausulasSelecionadas,
      extrasPorClausula: draft.extrasPorClausula,
    });
    return {
      id: saved.id,
      modeloSlug: saved.modeloSlug,
      sourceDocumentId: saved.sourceDocumentId,
      respostas: saved.respostas,
      stepIndex: saved.stepIndex,
      clausulasSelecionadas: saved.clausulasSelecionadas,
      extrasPorClausula: saved.extrasPorClausula,
      updatedAt: saved.updatedAt,
    };
  }

  const requestId = getOrCreateFinalizationRequestId(draft.modeloSlug);
  saveGuestDraftRaw(draft.modeloSlug, {
    requestId,
    modeloSlug: draft.modeloSlug,
    answers: draft.respostas,
    stepIndex: draft.stepIndex,
    clausulasSelecionadas: draft.clausulasSelecionadas,
    extrasPorClausula: draft.extrasPorClausula,
    guestContact: draft.guestContact,
  });

  return {
    ...draft,
    updatedAt: now,
  };
}

/**
 * Remove o rascunho de forma completa:
 * - Exclui rascunho remoto da conta (se houver id)
 * - Limpa rascunho local de convidado
 * - Limpa chave de intenção de idempotência
 */
export async function deleteClientDraft(
  params: { slug: string; draftId?: string },
  user?: { uid: string } | null
): Promise<void> {
  if (user && params.draftId) {
    try {
      await deleteAccountDraftRaw(params.draftId);
    } catch {
      // ignore
    }
  }

  clearGuestDraftRaw(params.slug);
  clearFinalizationRequestId(params.slug);
}

/**
 * Orquestra a finalização do rascunho:
 * - Compila respostas canonicamente
 * - Envia para criação de versão se sourceDocumentId estiver definido, ou finalização de novo documento
 * - Realiza limpeza atômica dos rascunhos em caso de sucesso
 * - Limpa ou preserva o requestId de idempotência conforme o tipo de erro
 */
export async function finalizeClientDraft(
  params: FinalizeClientDraftParams
): Promise<FinalizeClientDraftResult> {
  const { draft, orderId, user, finalizer, versionCreator } = params;
  const requestId = getOrCreateFinalizationRequestId(draft.modeloSlug);
  const respostasFinais = compileDraftAnswers(draft);

  try {
    if (draft.sourceDocumentId) {
      const creator = versionCreator || createDocumentVersionRaw;
      const res = await creator(draft.sourceDocumentId, {
        requestId,
        respostas: respostasFinais,
        clausulasSelecionadas: draft.clausulasSelecionadas,
        orderId,
      });

      await deleteClientDraft({ slug: draft.modeloSlug, draftId: draft.id }, user);

      return {
        document: res.document,
        isNewVersion: true,
      };
    }

    const runFinalize = finalizer || finalizeDocumentRaw;
    const res = await runFinalize({
      requestId,
      modeloSlug: draft.modeloSlug,
      respostas: respostasFinais,
      clausulasSelecionadas: draft.clausulasSelecionadas,
      guestContact: user ? undefined : draft.guestContact,
      orderId,
    });

    await deleteClientDraft({ slug: draft.modeloSlug, draftId: draft.id }, user);

    return {
      document: res.document,
      isNewVersion: false,
    };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (!shouldPreserveFinalizationRequestId(code)) {
      clearFinalizationRequestId(draft.modeloSlug);
    }
    throw error;
  }
}
