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

  it("não encerra a sessão nem desloga o usuário quando o backend rejeita o token renovado (preserva login client-side e propaga resposta 401)", async () => {
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

    const response = await mod.firebaseAuthenticatedFetch("/api/test", {}, {
      auth,
      fetchImpl: async () => {
        fetchCalls += 1;
        return jsonResponse(401, "INVALID_AUTH_TOKEN");
      },
      signOutUser: async () => {
        signOutCalls += 1;
      },
    });

    expect(response.status).toBe(401);
    expect(fetchCalls).toBe(2);
    // Não deve chamar signOutUser quando o erro é rejeição do backend
    expect(signOutCalls).toBe(0);
  });

  it("encerra a sessão se a renovação do token falhar por erro fatal de revogação da conta", async () => {
    const mod = await loadModule();
    expect(typeof mod.firebaseAuthenticatedFetch).toBe("function");
    if (!mod.firebaseAuthenticatedFetch) return;

    let refreshAttempted = false;
    const auth = {
      currentUser: {
        getIdToken: async (forceRefresh?: boolean) => {
          if (forceRefresh) {
            refreshAttempted = true;
            const err = new Error("User account disabled") as Error & { code?: string };
            err.code = "auth/user-disabled";
            throw err;
          }
          return "token-antigo";
        },
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

    expect(fetchCalls).toBe(1);
    expect(refreshAttempted).toBe(true);
    expect(signOutCalls).toBe(1);
  });

  it("encerra a sessão se a obtenção inicial do token falhar por erro fatal de revogação da conta", async () => {
    const mod = await loadModule();
    expect(typeof mod.firebaseAuthenticatedFetch).toBe("function");
    if (!mod.firebaseAuthenticatedFetch) return;

    const auth = {
      currentUser: {
        getIdToken: async () => {
          const err = new Error("User not found") as Error & { code?: string };
          err.code = "auth/user-not-found";
          throw err;
        },
      },
    };

    let signOutCalls = 0;

    await expect(
      mod.firebaseAuthenticatedFetch("/api/test", {}, {
        auth,
        signOutUser: async () => {
          signOutCalls += 1;
        },
      })
    ).rejects.toMatchObject({ code: "AUTH_SESSION_EXPIRED" });

    expect(signOutCalls).toBe(1);
  });

  it("não desloga o usuário se a renovação do token falhar por erro transitório de rede", async () => {
    const mod = await loadModule();
    expect(typeof mod.firebaseAuthenticatedFetch).toBe("function");
    if (!mod.firebaseAuthenticatedFetch) return;

    let refreshAttempted = false;
    const auth = {
      currentUser: {
        getIdToken: async (forceRefresh?: boolean) => {
          if (forceRefresh) {
            refreshAttempted = true;
            const err = new Error("network timeout") as Error & { code?: string };
            err.code = "auth/network-request-failed";
            throw err;
          }
          return "token-antigo";
        },
      },
    };

    let signOutCalls = 0;

    await expect(
      mod.firebaseAuthenticatedFetch("/api/test", {}, {
        auth,
        fetchImpl: async () => jsonResponse(401, "INVALID_AUTH_TOKEN"),
        signOutUser: async () => {
          signOutCalls += 1;
        },
      })
    ).rejects.toMatchObject({ code: "AUTH_TOKEN_UNAVAILABLE" });

    expect(refreshAttempted).toBe(true);
    expect(signOutCalls).toBe(0);
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

  it("desduplica chamadas simultâneas de renovação de token sob 401 concorrente", async () => {
    const mod = await loadModule();
    expect(typeof mod.firebaseAuthenticatedFetch).toBe("function");
    if (!mod.firebaseAuthenticatedFetch) return;

    let refreshCalls = 0;
    const auth = {
      currentUser: {
        getIdToken: async (forceRefresh?: boolean) => {
          if (forceRefresh) {
            refreshCalls += 1;
            await new Promise((r) => setTimeout(r, 10));
            return "token-renovado";
          }
          return "token-antigo";
        },
      },
    };

    let calls1 = 0;
    let calls2 = 0;
    const fetchImpl1 = async () => {
      calls1 += 1;
      return calls1 === 1
        ? jsonResponse(401, "INVALID_AUTH_TOKEN")
        : jsonResponse(200);
    };
    const fetchImpl2 = async () => {
      calls2 += 1;
      return calls2 === 1
        ? jsonResponse(401, "INVALID_AUTH_TOKEN")
        : jsonResponse(200);
    };

    const [res1, res2] = await Promise.all([
      mod.firebaseAuthenticatedFetch("/api/documents", {}, { auth, fetchImpl: fetchImpl1 }),
      mod.firebaseAuthenticatedFetch("/api/drafts", {}, { auth, fetchImpl: fetchImpl2 }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(refreshCalls).toBe(1);
  });
});
