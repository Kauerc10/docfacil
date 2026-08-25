import { describe, expect, it, mock } from "bun:test";
import { AbacatePayClient } from "@/lib/server/billing/abacate/client";
import { BackendError } from "@/lib/server/errors";

describe("AbacatePayClient v2", () => {
  it("pins the API origin and authentication headers", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const mockFetch = mock(
      async (input: string | URL | Request, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedInit = init;
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: "store_123" },
            error: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    );

    const client = new AbacatePayClient(
      "dev_real_secret",
      mockFetch as unknown as typeof fetch,
      { timeoutMs: 100 }
    );

    const result = await client.request<{ id: string }>("/stores/get", {
      method: "GET",
      headers: { Authorization: "Bearer attacker" },
    });

    const headers = new Headers(capturedInit?.headers);
    expect(capturedUrl).toBe("https://api.abacatepay.com/v2/stores/get");
    expect(headers.get("Authorization")).toBe("Bearer dev_real_secret");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(capturedInit?.cache).toBe("no-store");
    expect(result.id).toBe("store_123");
  });

  it("rejects absolute URLs instead of forwarding the API key to another origin", async () => {
    const mockFetch = mock(async () => {
      throw new Error("fetch must not run");
    });
    const client = new AbacatePayClient(
      "dev_real_secret",
      mockFetch as unknown as typeof fetch
    );

    await expect(
      client.request("https://evil.example/collect", { method: "GET" })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST", status: 400 });
    expect(mockFetch).toHaveBeenCalledTimes(0);
  });

  it("fails closed on timeout", async () => {
    const hangingFetch = mock(
      async (_input: string | URL | Request, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) return;
          if (signal.aborted) {
            reject(signal.reason);
            return;
          }
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        })
    );

    const client = new AbacatePayClient(
      "dev_real_secret",
      hangingFetch as unknown as typeof fetch,
      { timeoutMs: 10 }
    );

    await expect(client.request("/stores/get")).rejects.toMatchObject({
      code: "BILLING_PROVIDER_FAILED",
      status: 502,
    });
  });

  it("does not leak provider responses or the API key in public errors", async () => {
    const mockFetch = mock(async () =>
      new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: "raw SQL trace api-key=dev_real_secret",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = new AbacatePayClient(
      "dev_real_secret",
      mockFetch as unknown as typeof fetch
    );

    try {
      await client.request("/checkouts/create", { method: "POST" });
      expect().fail("request should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(BackendError);
      const backendError = error as BackendError;
      expect(backendError.code).toBe("BILLING_PROVIDER_FAILED");
      expect(backendError.status).toBe(502);
      expect(backendError.message).not.toContain("raw SQL trace");
      expect(backendError.message).not.toContain("dev_real_secret");
    }
  });

  it("maps store-level CARD capability errors to a safe actionable response", async () => {
    const mockFetch = mock(async () =>
      new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: "CARD is not available for this store",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = new AbacatePayClient(
      "dev_real_secret",
      mockFetch as unknown as typeof fetch
    );

    await expect(
      client.request("/checkouts/create", { method: "POST" })
    ).rejects.toMatchObject({
      code: "BILLING_METHOD_UNAVAILABLE",
      status: 503,
      message: "Pagamento com cartão ainda não está habilitado nesta loja. Use Pix por enquanto.",
    });
  });

  it("treats a 200 error envelope as provider failure", async () => {
    const mockFetch = mock(async () =>
      new Response(
        JSON.stringify({ success: false, data: null, error: "invalid product" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const client = new AbacatePayClient(
      "dev_real_secret",
      mockFetch as unknown as typeof fetch
    );

    await expect(client.request("/products/create", { method: "POST" })).rejects.toMatchObject({
      code: "BILLING_PROVIDER_FAILED",
      status: 502,
    });
  });
});
