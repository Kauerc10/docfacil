import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { POST } from "./route";
import {
  setAdminAppCheckForTesting,
  setAdminAuthForTesting,
} from "@/lib/server/firebase-admin";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import {
  InMemoryDocumentsRepository,
  InMemoryUsersRepository,
} from "@/lib/server/firestore/in-memory-repositories";

const validPayload = {
  modeloSlug: "declaracao-residencia",
  respostas: {
    declarante_nome: "Maria Silva",
    declarante_cpf: "123.456.789-00",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteira",
    declarante_profissao: "Autônoma",
    declarante_cep: "01310-100",
    declarante_rua: "Av. Paulista",
    declarante_numero: "1000",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante de residência para matrícula",
    cidade_data: "São Paulo, 14 de agosto de 2026",
  },
  clausulasSelecionadas: [],
};

function request(body: unknown, headers: HeadersInit = {}): Request {
  return new Request("http://localhost:3000/api/documents/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Firebase-AppCheck": "valid-app-check-token",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/documents/preview", () => {
  let documents: InMemoryDocumentsRepository;

  beforeEach(() => {
    documents = new InMemoryDocumentsRepository();
    setRepositoriesForTesting({
      documents,
      users: new InMemoryUsersRepository(),
    });
    setAdminAppCheckForTesting({
      verifyToken: async (token: string) => {
        if (token !== "valid-app-check-token") throw new Error("invalid App Check");
        return { appId: "preview-test", token: {} as never };
      },
    } as never);
    setAdminAuthForTesting({
      verifyIdToken: async (token: string) => {
        if (token !== "valid-user-token") throw new Error("invalid auth");
        return { uid: "preview-user", email: "preview@example.com" } as never;
      },
    } as never);
  });

  afterEach(() => {
    setRepositoriesForTesting(null);
    setAdminAppCheckForTesting(null);
    setAdminAuthForTesting(null);
  });

  it("requires an authenticated user after App Check succeeds", async () => {
    const res = await POST(request(validPayload));

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("INVALID_AUTH_TOKEN");
  });

  it("requires a valid App Check token", async () => {
    const res = await POST(
      request(validPayload, {
        Authorization: "Bearer valid-user-token",
        "X-Firebase-AppCheck": "invalid-app-check-token",
      })
    );

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("APP_CHECK_INVALID");
  });

  it("rejects malformed or oversized preview payloads", async () => {
    const malformed = await POST(
      request({ modeloSlug: "declaracao-residencia" }, { Authorization: "Bearer valid-user-token" })
    );
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe("INVALID_REQUEST");

    const oversized = await POST(
      request("x".repeat(256 * 1024 + 1), { Authorization: "Bearer valid-user-token" })
    );
    expect(oversized.status).toBe(413);
    expect((await oversized.json()).error.code).toBe("INVALID_REQUEST");
  });

  it("returns a private PDF preview without creating a document", async () => {
    const createDocument = spyOn(documents, "createDocument");
    const res = await POST(
      request(validPayload, { Authorization: "Bearer valid-user-token" })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("inline");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(res.headers.get("Pragma")).toBe("no-cache");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(new TextDecoder().decode((await res.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
    expect(createDocument).not.toHaveBeenCalled();
  });
});
