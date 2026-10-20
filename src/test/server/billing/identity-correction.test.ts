import { describe, expect, it } from "bun:test";
import {
  requestIdentityCorrection,
  reviewIdentityCorrection,
  hashIdentifier,
} from "../../../lib/server/billing/identity-correction";
import { BackendError } from "../../../lib/server/errors";

describe("Identity correction requests & audit (Ticket 18)", () => {
  it("creates a correction request with masked current identifier and audit metadata", async () => {
    const store = new Map<string, any>();
    const fakeDb = {
      collection: (col: string) => ({
        doc: (id: string) => ({
          get: async () => {
            if (col === "documents" && id === "doc-123") {
              return {
                exists: true,
                data: () => ({
                  id: "doc-123",
                  status: "ready",
                  owner: {
                    type: "user",
                    userId: "user-owner",
                  },
                  respostas: {
                    declarante_cpf: "123.456.789-01",
                  },
                }),
              };
            }
            return { exists: store.has(id), data: () => store.get(id) };
          },
          set: async (data: any) => {
            store.set(id, data);
          },
        }),
      }),
    };

    const record = await requestIdentityCorrection({
      documentId: "doc-123",
      requestedId: "123.456.789-02",
      reason: "Errei o último dígito do meu CPF na digitação rápida.",
      principal: { type: "user", userId: "user-owner", email: "owner@example.com" },
      db: fakeDb as never,
    });

    expect(record.status).toBe("pending");
    expect(record.maskedCurrentId).toBe("123.***.***-01");
    expect(record.requestedId).toBe("123.456.789-02");
    expect(record.requesterEmail).toBe("owner@example.com");
  });

  it("rejects request if user does not own the document", async () => {
    const fakeDb = {
      collection: () => ({
        doc: () => ({
          get: async () => ({
            exists: true,
            data: () => ({
              id: "doc-123",
              status: "ready",
              owner: {
                type: "user",
                userId: "other-user",
                contact: { email: "other@example.com" },
              },
            }),
          }),
        }),
      }),
    };

    expect(
      requestIdentityCorrection({
        documentId: "doc-123",
        requestedId: "123.456.789-02",
        reason: "Trocando CPF alheio.",
        principal: { type: "user", userId: "attacker", email: "attacker@example.com" },
        db: fakeDb as never,
      })
    ).rejects.toThrow(BackendError);
  });

  it("reviews identity correction and approves it once without replay", async () => {
    const store = new Map<string, any>();
    const initialRecord = {
      id: "correction:doc-123",
      documentId: "doc-123",
      status: "pending",
      requestedId: "123.456.789-02",
      createdAt: Date.now(),
    };
    store.set("correction:doc-123", initialRecord);

    const fakeDb = {
      collection: () => ({
        doc: (id: string) => ({ id }),
      }),
      runTransaction: async (fn: any) => {
        const tx = {
          get: async (ref: any) => ({
            exists: store.has(ref.id),
            data: () => store.get(ref.id),
          }),
          update: async (ref: any, data: any) => {
            const current = store.get(ref.id);
            store.set(ref.id, { ...current, ...data });
          },
        };
        return fn(tx);
      },
    };

    const reviewed = await reviewIdentityCorrection({
      correctionId: "correction:doc-123",
      decision: "approved",
      reviewerId: "admin-456",
      decisionNotes: "Dígito conferido com documento enviado pelo cliente.",
      db: fakeDb as never,
    });

    expect(reviewed.status).toBe("approved");
    expect(reviewed.reviewedBy).toBe("admin-456");
    expect(reviewed.decisionNotes).toBe("Dígito conferido com documento enviado pelo cliente.");

    // Segunda revisão deve falhar com CONFLICT
    expect(
      reviewIdentityCorrection({
        correctionId: "correction:doc-123",
        decision: "rejected",
        reviewerId: "admin-789",
        db: fakeDb as never,
      })
    ).rejects.toThrow(BackendError);
  });

  it("hashes identifiers deterministically without leaking plaintext in digests", () => {
    const h1 = hashIdentifier("123.456.789-01");
    const h2 = hashIdentifier("12345678901");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});
