import { auth, getClientAppCheckToken } from "../firebase";
import { getOrCreateFinalizationRequestId, clearFinalizationRequestId } from "./idempotency";
export { getOrCreateFinalizationRequestId, clearFinalizationRequestId };

export interface GuestDraftData {
  requestId: string;
  modeloSlug: string;
  answers: Record<string, string>;
  stepIndex: number;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
  guestContact?: { email?: string; phone?: string };
  updatedAt: number;
}

export function getGuestDraftKey(modeloSlug: string): string {
  return `docfacil:draft:v1:${modeloSlug}`;
}

let memoryDraftStorage: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  if (typeof localStorage !== "undefined") {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    } catch {
      // fallback
    }
  }
  return memoryDraftStorage[key] ?? null;
}

function setStorageItem(key: string, value: string): void {
  memoryDraftStorage[key] = value;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }
}

function removeStorageItem(key: string): void {
  delete memoryDraftStorage[key];
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export function saveGuestDraft(modeloSlug: string, data: Omit<GuestDraftData, "updatedAt">): void {
  try {
    const payload: GuestDraftData = {
      ...data,
      updatedAt: Date.now(),
    };
    setStorageItem(getGuestDraftKey(modeloSlug), JSON.stringify(payload));
  } catch {
    // Ignore write error
  }
}

export function loadGuestDraft(modeloSlug: string): GuestDraftData | null {
  try {
    const raw = getStorageItem(getGuestDraftKey(modeloSlug));
    return raw ? (JSON.parse(raw) as GuestDraftData) : null;
  } catch {
    return null;
  }
}

export function clearGuestDraft(modeloSlug: string): void {
  try {
    removeStorageItem(getGuestDraftKey(modeloSlug));
  } catch {
    // Ignore
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth && auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }
    } catch {
      // Continue without auth header
    }
  }

  try {
    const appCheckToken = await getClientAppCheckToken();
    if (appCheckToken) {
      headers["X-Firebase-AppCheck"] = appCheckToken;
    }
  } catch {
    // Continue
  }

  return headers;
}

export async function finalizeDocument(input: {
  requestId?: string;
  modeloSlug: string;
  respostas: Record<string, string>;
  clausulasSelecionadas?: string[];
  guestContact?: { email?: string; phone?: string };
  orderId?: string;
}): Promise<{
  document: {
    id: string;
    version: number;
    artifactState: string;
    guestAccessToken?: string;
    guestAccessPath?: string;
  };
}> {
  const headers = await getAuthHeaders();
  const requestId = input.requestId || getOrCreateFinalizationRequestId(input.modeloSlug);

  const res = await fetch("/api/documents/finalize", {
    method: "POST",
    headers,
    body: JSON.stringify({
      requestId,
      modeloSlug: input.modeloSlug,
      respostas: input.respostas,
      clausulasSelecionadas: input.clausulasSelecionadas || [],
      guestContact: input.guestContact,
      orderId: input.orderId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Falha ao gerar documento.");
  }

  return await res.json();
}

export async function createDocumentVersion(
  documentId: string,
  input: {
    requestId?: string;
    respostas: Record<string, string>;
    clausulasSelecionadas?: string[];
  }
): Promise<{
  document: {
    id: string;
    version: number;
    artifactState: string;
  };
}> {
  const headers = await getAuthHeaders();
  const requestId = input.requestId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "req_" + Date.now());

  const res = await fetch(`/api/documents/${documentId}/versions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      requestId,
      respostas: input.respostas,
      clausulasSelecionadas: input.clausulasSelecionadas || [],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Falha ao criar nova versão do documento.");
  }

  return await res.json();
}

export async function getDocumentDownloadUrl(
  documentId: string,
  version?: number
): Promise<{
  downloadUrl: string;
  filename: string;
  version: number;
  sha256: string;
  expiresIn: number;
}> {
  const headers = await getAuthHeaders();

  const res = await fetch(`/api/documents/${documentId}/download`, {
    method: "POST",
    headers,
    body: JSON.stringify({ version }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Falha ao obter link de download.");
  }

  return await res.json();
}

export async function shareDocument(documentId: string): Promise<{
  shareUrl: string;
  token: string;
  version: number;
  active: boolean;
}> {
  const headers = await getAuthHeaders();

  const res = await fetch(`/api/documents/${documentId}/share`, {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Falha ao gerar link de compartilhamento.");
  }

  return await res.json();
}

export async function revokeDocumentShare(documentId: string): Promise<{
  success: boolean;
  revokedAt: number;
}> {
  const headers = await getAuthHeaders();

  const res = await fetch(`/api/documents/${documentId}/share/revoke`, {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Falha ao revogar compartilhamento.");
  }

  return await res.json();
}

export async function deleteDocumentApi(documentId: string): Promise<{
  success: boolean;
  deletedDocumentId: string;
}> {
  const headers = await getAuthHeaders();

  const res = await fetch(`/api/documents/${documentId}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Falha ao excluir documento.");
  }

  return await res.json();
}

export async function listDocumentsApi(): Promise<import("./dto").DocumentSummaryDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/documents", {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Falha ao listar documentos.");
  }

  const data = await res.json();
  return data.documents || [];
}

export async function getDocumentApi(documentId: string): Promise<import("./dto").DocumentDetailDto | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/documents/${documentId}`, {
    method: "GET",
    headers,
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Falha ao carregar documento.");
  }

  const data = await res.json();
  return data.document || null;
}

export async function duplicateDocumentApi(documentId: string): Promise<{
  duplicateDraft: {
    modeloSlug: string;
    respostas: Record<string, string>;
    clausulasSelecionadas: string[];
    extrasPorClausula: Record<string, Record<string, string>>;
  };
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/documents/${documentId}/duplicate`, {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Falha ao duplicar documento.");
  }

  return await res.json();
}
