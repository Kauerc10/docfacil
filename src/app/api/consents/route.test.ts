import { describe, expect, it, beforeEach } from "bun:test";
import { POST, GET } from "./route";
import {
  setAdminAuthForTesting,
  setAdminFirestoreForTesting,
} from "@/lib/server/firebase-admin";

function createPostRequest(body: unknown, authHeader?: string) {
  return new Request("http://localhost:3000/api/consents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

function createGetRequest(authHeader?: string) {
  return new Request("http://localhost:3000/api/consents", {
    method: "GET",
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });
}

describe("/api/consents route", () => {
  let savedDocs: Array<{ id: string; data: any }> = [];

  const mockFirestore: any = {
    collection: (collName: string) => {
      if (collName !== "consents") throw new Error(`Unexpected collection ${collName}`);
      return {
        doc: (docId?: string) => {
          const id = docId || `consent_${Math.random().toString(36).slice(2, 9)}`;
          return {
            id,
            set: async (data: any) => {
              savedDocs.push({ id, data });
            },
          };
        },
        where: (field: string, op: string, val: string) => ({
          orderBy: (orderField: string, direction: string) => ({
            limit: (limitNum: number) => ({
              get: async () => ({
                docs: savedDocs
                  .filter((d) => d.data[field] === val)
                  .sort((a, b) => (b.data[orderField] ?? 0) - (a.data[orderField] ?? 0))
                  .slice(0, limitNum)
                  .map((d) => ({
                    id: d.id,
                    data: () => d.data,
                  })),
              }),
            }),
          }),
        }),
      };
    },
  };

  beforeEach(() => {
    savedDocs = [];
    setAdminAuthForTesting(null);
    setAdminFirestoreForTesting(null);
  });

  describe("POST /api/consents", () => {
    it("exige autenticação antes de registrar aceite de cadastro", async () => {
      const res = await POST(
        createPostRequest({
          documents: ["termos", "privacidade"],
          flow: "cadastro",
          guestEmail: "teste@example.com",
        })
      );

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_AUTH_TOKEN");
    });

    it("exige e-mail para consentimento de checkout guest", async () => {
      const res = await POST(
        createPostRequest({
          documents: ["termos", "privacidade"],
          flow: "checkout",
        })
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("não aceita consentimento sem Termos e Privacidade juntos", async () => {
      const res = await POST(
        createPostRequest({
          documents: ["termos", "marketing"],
          flow: "checkout",
          guestEmail: "teste@example.com",
        })
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    it("registra consentimento de checkout para visitante com e-mail", async () => {
      setAdminFirestoreForTesting(mockFirestore);

      const res = await POST(
        createPostRequest({
          documents: ["termos", "privacidade", "marketing"],
          flow: "checkout",
          guestEmail: "visitante@example.com",
        })
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.consent.principalType).toBe("guest");
      expect(data.consent.userEmail).toBe("visitante@example.com");
      expect(data.consent.marketingOptIn).toBe(true);
      expect(data.consent.termsHash).toBeDefined();
      expect(data.consent.privacyVersion).toBeDefined();
      expect(savedDocs.length).toBe(1);
    });

    it("registra consentimento de usuário autenticado no cadastro", async () => {
      setAdminFirestoreForTesting(mockFirestore);
      setAdminAuthForTesting({
        verifyIdToken: async () => ({ uid: "usr_auth_123", email: "cad@example.com" } as any),
      } as any);

      const res = await POST(
        createPostRequest(
          {
            documents: ["termos", "privacidade"],
            flow: "cadastro",
          },
          "Bearer valid-token"
        )
      );

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.consent.principalType).toBe("user");
      expect(data.consent.userId).toBe("usr_auth_123");
      expect(data.consent.userEmail).toBe("cad@example.com");
      expect(data.consent.marketingOptIn).toBe(false);
      expect(savedDocs.length).toBe(1);
    });
  });

  describe("GET /api/consents", () => {
    it("exige autenticação para listar consentimentos", async () => {
      const res = await GET(createGetRequest());
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe("INVALID_AUTH_TOKEN");
    });

    it("retorna o histórico de consentimentos do usuário autenticado", async () => {
      setAdminFirestoreForTesting(mockFirestore);
      setAdminAuthForTesting({
        verifyIdToken: async () => ({ uid: "usr_auditor", email: "auditor@example.com" } as any),
      } as any);

      savedDocs.push(
        {
          id: "consent_1",
          data: {
            userId: "usr_auditor",
            userEmail: "auditor@example.com",
            flow: "cadastro",
            acceptedAt: 1000,
          },
        },
        {
          id: "consent_2",
          data: {
            userId: "usr_auditor",
            userEmail: "auditor@example.com",
            flow: "document-generation",
            acceptedAt: 2000,
          },
        },
        {
          id: "consent_other",
          data: {
            userId: "other_user",
            userEmail: "other@example.com",
            flow: "cadastro",
            acceptedAt: 3000,
          },
        }
      );

      const res = await GET(createGetRequest("Bearer valid-token"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const data = await res.json();
      expect(Array.isArray(data.consents)).toBe(true);
      expect(data.consents.length).toBe(2);
      expect(data.consents[0].id).toBe("consent_2");
      expect(data.consents[1].id).toBe("consent_1");
    });
  });
});

