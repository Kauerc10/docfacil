import { describe, expect, it } from "bun:test";

type AuthModule = typeof import("@/lib/auth/authenticated-fetch");

async function loadModule(): Promise<Partial<AuthModule>> {
  try {
    return await import("@/lib/auth/authenticated-fetch");
  } catch {
    return {};
  }
}

function jsonResponse(status: number, code?: string): Response {
  return new Response(
    JSON.stringify(code ? { error: { code } } : { ok: true }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

describe("firebaseAuthenticatedFetch", () => {
  it("falha fechado quando existe usuário mas o token não pode ser obtido", async () => {
    const mod = await loadModule();
    expect(typeof mod.firebaseAuthenticatedFetch).toBe("function");
    if (!mod.firebaseAuthenticatedFetch) return;

    let fetchCalls = 0;
    const auth = {
      currentUser: {
        getIdToken: async () => {
          throw new Error("token indisponível");
        },
      },
    };

    await expect(
      mod.firebaseAuthenticatedFetch("/api/test", {}, {
        auth,
        fetchImpl: async () => {
          fetchCalls += 1;
          return jsonResponse(200);
        },
      })
    ).rejects.toMatchObject({ code: "AUTH_TOKEN_UNAVAILABLE" });

    expect(fetchCalls).toBe(0);
  });

  it("renova o ID token uma única vez após INVALID_AUTH_TOKEN e repete a request", async () => {
    const mod = await loadModule();
    expect(typeof mod.firebaseAuthenticatedFetch).toBe("function");
    if (!mod.firebaseAuthenticatedFetch) return;

    const forceRefreshCalls: boolean[] = [];
    const auth = {
      currentUser: {
        getIdToken: async (forceRefresh?: boolean) => {
          forceRefreshCalls.push(Boolean(forceRefresh));
          return forceRefresh ? "token-novo" : "token-antigo";
        },
      },
    };

    const authorizations: string[] = [];
    let fetchCalls = 0;
    const response = await mod.firebaseAuthenticatedFetch("/api/test", {}, {
      auth,
      fetchImpl: async (_input, init) => {
        fetchCalls += 1;
        authorizations.push(new Headers(init?.headers).get("Authorization") || "");
        return fetchCalls === 1
          ? jsonResponse(401, "INVALID_AUTH_TOKEN")
          : jsonResponse(200);
      },
    });

    expect(response.status).toBe(200);
    expect(fetchCalls).toBe(2);
    expect(forceRefreshCalls).toEqual([false, true]);
    expect(authorizations).toEqual([
      "Bearer token-antigo",
      "Bearer token-novo",
    ]);
  });

  it("encerra a sessão quando o token renovado também é rejeitado", async () => {
    const mod = await loadModule();
    expect(typeof mod.firebaseAuthenticatedFetch).toBe("function");
    if (!mod.firebaseAuthenticatedFetch) return;

    const auth = {
      currentUser: {
        getIdToken: async (forceRefresh?: boolean) =>
          forceRefresh ? "token-novo" : "token-antigo",
      },
    };

    let fetchCalls = 0;
    let signOutCalls = 0;

    await expect(
      mod.firebaseAuthenticatedFetch("/api/test", {}, {
        auth,
        fetchImpl: async () => {
          fetchCalls += 1;
          return jsonResponse(401, "INVALID_AUTH_TOKEN");
        },
        signOutUser: async () => {
          signOutCalls += 1;
        },
      })
    ).rejects.toMatchObject({ code: "AUTH_SESSION_EXPIRED" });

    expect(fetchCalls).toBe(2);
    expect(signOutCalls).toBe(1);
  });

  it("mantém o fluxo guest quando não existe usuário autenticado", async () => {
    const mod = await loadModule();
    expect(typeof mod.firebaseAuthenticatedFetch).toBe("function");
    if (!mod.firebaseAuthenticatedFetch) return;

    let authorization: string | null = "unexpected";
    const response = await mod.firebaseAuthenticatedFetch("/api/test", {}, {
      auth: { currentUser: null },
      fetchImpl: async (_input, init) => {
        authorization = new Headers(init?.headers).get("Authorization");
        return jsonResponse(200);
      },
    });

    expect(response.status).toBe(200);
    expect(authorization).toBeNull();
  });
});
