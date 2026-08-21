import { apiFetch } from "@/lib/auth/api-fetch";

export interface PdfPreviewPayload {
  modeloSlug: string;
  respostas: Record<string, string>;
  clausulasSelecionadas: string[];
}

const JSON_HEADERS = { "Content-Type": "application/json" };

/** Requests an ephemeral PDF through the authenticated browser API client. */
export async function requestPdfPreview(
  payload: PdfPreviewPayload,
  signal: AbortSignal
): Promise<Blob> {
  const response = await apiFetch("/api/documents/preview", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : "Não foi possível atualizar a prévia do documento.";
    throw new Error(message);
  }

  return response.blob();
}

interface PdfPreviewSessionOptions {
  requestPreview?: (payload: PdfPreviewPayload, signal: AbortSignal) => Promise<Blob>;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
  onUrlChange: (url: string | undefined) => void;
}

/**
 * Owns one in-memory PDF URL. A request sequence prevents a late response
 * from replacing a more recent preview even when an aborted fetch resolves.
 */
export class PdfPreviewSession {
  private readonly requestPreview: NonNullable<PdfPreviewSessionOptions["requestPreview"]>;
  private readonly createObjectURL: NonNullable<PdfPreviewSessionOptions["createObjectURL"]>;
  private readonly revokeObjectURL: NonNullable<PdfPreviewSessionOptions["revokeObjectURL"]>;
  private readonly onUrlChange: PdfPreviewSessionOptions["onUrlChange"];
  private controller: AbortController | undefined;
  private blobUrl: string | undefined;
  private sequence = 0;

  constructor(options: PdfPreviewSessionOptions) {
    this.requestPreview = options.requestPreview ?? requestPdfPreview;
    this.createObjectURL = options.createObjectURL ?? URL.createObjectURL.bind(URL);
    this.revokeObjectURL = options.revokeObjectURL ?? URL.revokeObjectURL.bind(URL);
    this.onUrlChange = options.onUrlChange;
  }

  async request(payload: PdfPreviewPayload): Promise<void> {
    this.cancel();
    const sequence = ++this.sequence;
    const controller = new AbortController();
    this.controller = controller;

    try {
      const blob = await this.requestPreview(payload, controller.signal);
      if (sequence !== this.sequence) return;

      const nextUrl = this.createObjectURL(blob);
      const previousUrl = this.blobUrl;
      this.blobUrl = nextUrl;
      this.onUrlChange(nextUrl);
      if (previousUrl) this.revokeObjectURL(previousUrl);
    } catch (error) {
      if (sequence !== this.sequence || controller.signal.aborted) return;
      throw error;
    } finally {
      if (sequence === this.sequence) this.controller = undefined;
    }
  }

  /** Invalidates any in-flight response while retaining the last good preview. */
  cancel(): void {
    this.sequence += 1;
    this.controller?.abort();
    this.controller = undefined;
  }

  /** Revokes the active URL when a preview must no longer be displayed. */
  clear(): void {
    this.cancel();
    if (!this.blobUrl) return;
    this.revokeObjectURL(this.blobUrl);
    this.blobUrl = undefined;
    this.onUrlChange(undefined);
  }

  dispose(): void {
    this.clear();
  }
}
