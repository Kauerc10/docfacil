import { beforeEach, describe, expect, it, mock } from "bun:test";

const apiFetch = mock();

mock.module("@/lib/auth/api-fetch", () => ({ apiFetch }));

const {
  PdfPreviewSession,
  requestPdfPreview,
} = await import("./preview-client");

const payload = {
  modeloSlug: "declaracao-residencia",
  respostas: { declarante_nome: "Maria Silva" },
  clausulasSelecionadas: [],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("requestPdfPreview", () => {
  beforeEach(() => apiFetch.mockReset());

  it("sends the preview payload through the authenticated API client", async () => {
    const signal = new AbortController().signal;
    apiFetch.mockResolvedValue(
      new Response(new Blob(["%PDF-preview"], { type: "application/pdf" }), {
        status: 200,
      })
    );

    const pdf = await requestPdfPreview(payload, signal);

    expect(pdf.type).toBe("application/pdf");
    expect(await pdf.text()).toBe("%PDF-preview");
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/documents/preview",
      expect.objectContaining({
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
  });

  it("surfaces the route error without returning a non-PDF response as a preview", async () => {
    apiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Dados de prévia inválidos." } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(requestPdfPreview(payload, new AbortController().signal)).rejects.toThrow(
      "Dados de prévia inválidos."
    );
  });
});

describe("PdfPreviewSession", () => {
  it("aborts an older request and ignores its late PDF in favor of the newest one", async () => {
    const first = deferred<Blob>();
    const second = deferred<Blob>();
    const requestPreview = mock()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const createObjectURL = mock((blob: Blob) => `blob:${blob.size}`);
    const revokeObjectURL = mock();
    const onUrlChange = mock();
    const session = new PdfPreviewSession({
      requestPreview,
      createObjectURL,
      revokeObjectURL,
      onUrlChange,
    });

    const oldRequest = session.request(payload);
    const oldSignal = requestPreview.mock.calls[0][1] as AbortSignal;
    const newRequest = session.request(payload);

    expect(oldSignal.aborted).toBe(true);

    first.resolve(new Blob(["old"]));
    await oldRequest;
    expect(onUrlChange).not.toHaveBeenCalled();

    second.resolve(new Blob(["newest"]));
    await newRequest;

    expect(onUrlChange).toHaveBeenLastCalledWith("blob:6");
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("replaces and revokes the previous Blob URL, then revokes the active one on cleanup", async () => {
    const requestPreview = mock()
      .mockResolvedValueOnce(new Blob(["first"]))
      .mockResolvedValueOnce(new Blob(["second"]));
    const createObjectURL = mock((blob: Blob) => `blob:${blob.size}`);
    const revokeObjectURL = mock();
    const onUrlChange = mock();
    const session = new PdfPreviewSession({
      requestPreview,
      createObjectURL,
      revokeObjectURL,
      onUrlChange,
    });

    await session.request(payload);
    await session.request(payload);

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:5");
    expect(onUrlChange).toHaveBeenLastCalledWith("blob:6");

    session.dispose();

    expect(revokeObjectURL).toHaveBeenLastCalledWith("blob:6");
    expect(onUrlChange).toHaveBeenLastCalledWith(undefined);
  });
});
