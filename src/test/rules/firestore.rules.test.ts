import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import * as fs from "node:fs";
import * as path from "node:path";

const RUN_FIRESTORE_RULES = process.env.RUN_FIRESTORE_RULES === "true";

describe.skipIf(!RUN_FIRESTORE_RULES)("Firestore Security Rules", () => {
  let testEnv: RulesTestEnvironment;
  const rules = fs.readFileSync(path.resolve(process.cwd(), "firestore.rules"), "utf8");

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "demo-docfacil-rules-test",
      firestore: {
        rules,
        host: "127.0.0.1",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  it("proves the Firestore Emulator enforces server-only access", async () => {
    const context = testEnv.unauthenticatedContext();
    const ref = context.firestore().collection("__health").doc("probe");
    await assertFails(ref.get());
  });

  describe("rules structure and locks", () => {
    it("declares rules_version 2", () => {
      expect(rules).toContain("rules_version = '2';");
    });

    it("locks server-only collections against client writes", () => {
      expect(rules).toContain("match /documents/{id}");
      expect(rules).toContain("allow write: if false;");
      expect(rules).toContain("match /access_links/{tokenHash}");
      expect(rules).toContain("match /generation_requests/{requestId}");
      expect(rules).toContain("match /orders/{orderId}");
    });

    it("verifies user creation requires plano gratis and restricts updates", () => {
      expect(rules).toContain("request.resource.data.plano == 'gratis'");
      expect(rules).toContain("hasOnly(['nome', 'telefone', 'fotoUrl', 'atualizadoEm'])");
    });
  });

  describe("users rules", () => {
    it("allows user to create own profile with plano gratis", async () => {
      const alice = testEnv.authenticatedContext("alice");
      await assertSucceeds(
        alice.firestore().collection("users").doc("alice").set({
          uid: "alice",
          nome: "Alice",
          plano: "gratis",
          criadoEm: Date.now(),
        })
      );
    });

    it("blocks user from creating profile with plano pro", async () => {
      const bob = testEnv.authenticatedContext("bob");
      await assertFails(
        bob.firestore().collection("users").doc("bob").set({
          uid: "bob",
          nome: "Bob",
          plano: "pro",
          criadoEm: Date.now(),
        })
      );
    });

    it("allows user to update nome, telefone, fotoUrl, atualizadoEm", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc("alice").set({
          uid: "alice",
          nome: "Alice",
          plano: "gratis",
        });
      });
      const alice = testEnv.authenticatedContext("alice");
      await assertSucceeds(
        alice.firestore().collection("users").doc("alice").update({
          nome: "Alice Silva",
          telefone: "(11) 99999-9999",
          fotoUrl: "https://example.com/photo.jpg",
          atualizadoEm: Date.now(),
        })
      );
    });

    it("blocks user from mutating plano directly", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc("alice").set({
          uid: "alice",
          nome: "Alice",
          plano: "gratis",
        });
      });
      const alice = testEnv.authenticatedContext("alice");
      await assertFails(
        alice.firestore().collection("users").doc("alice").update({
          plano: "pro",
        })
      );
    });

    it("blocks user from mutating uid or email or role or subscription", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc("alice").set({
          uid: "alice",
          nome: "Alice",
          email: "alice@example.com",
          plano: "gratis",
        });
      });
      const alice = testEnv.authenticatedContext("alice");
      await assertFails(
        alice.firestore().collection("users").doc("alice").update({
          email: "alice2@example.com",
        })
      );
      await assertFails(
        alice.firestore().collection("users").doc("alice").update({
          role: "admin",
        })
      );
      await assertFails(
        alice.firestore().collection("users").doc("alice").update({
          subscription: { active: true },
        })
      );
      await assertFails(
        alice.firestore().collection("users").doc("alice").update({
          uid: "alice_hacked",
        })
      );
    });
  });

  describe("documents rules", () => {
    it("allows authenticated owner to read own document", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("documents").doc("doc_1").set({
          owner: { type: "user", userId: "alice" },
          modeloSlug: "declaracao-residencia",
        });
      });
      const alice = testEnv.authenticatedContext("alice");
      await assertSucceeds(alice.firestore().collection("documents").doc("doc_1").get());
    });

    it("blocks other user from reading document", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("documents").doc("doc_1").set({
          owner: { type: "user", userId: "alice" },
          modeloSlug: "declaracao-residencia",
        });
      });
      const bob = testEnv.authenticatedContext("bob");
      await assertFails(bob.firestore().collection("documents").doc("doc_1").get());
    });

    it("blocks client from creating, updating or deleting documents directly", async () => {
      const alice = testEnv.authenticatedContext("alice");
      await assertFails(
        alice.firestore().collection("documents").add({
          owner: { type: "user", userId: "alice" },
          modeloSlug: "declaracao-residencia",
        })
      );
      await assertFails(
        alice.firestore().collection("documents").doc("doc_1").update({
          modeloSlug: "hacked",
        })
      );
      await assertFails(alice.firestore().collection("documents").doc("doc_1").delete());
    });
  });

  describe("consents rules", () => {
    it("allows an authenticated user to record and read only their own consent", async () => {
      const alice = testEnv.authenticatedContext("alice");
      const bob = testEnv.authenticatedContext("bob");

      await assertSucceeds(
        alice.firestore().collection("consents").doc("alice-terms-v1").set({
          userId: "alice",
          userEmail: "alice@example.com",
          documents: ["termos", "privacidade"],
          termsVersion: "1.0",
          flow: "cadastro",
          acceptedAt: 1,
          userAgent: "test-agent",
          termsHash: "docfacil-terms-v1.0",
        })
      );

      await assertSucceeds(
        alice.firestore().collection("consents").doc("alice-terms-v1").get()
      );
      await assertFails(
        bob.firestore().collection("consents").doc("alice-terms-v1").get()
      );
      await assertFails(
        bob.firestore().collection("consents").doc("forged").set({
          userId: "alice",
          userEmail: "alice@example.com",
          documents: ["termos", "privacidade"],
          termsVersion: "1.0",
          flow: "cadastro",
          acceptedAt: 1,
          userAgent: "test-agent",
          termsHash: "docfacil-terms-v1.0",
        })
      );
    });

    it("blocks anonymous consent records", async () => {
      const anonymous = testEnv.unauthenticatedContext();

      await assertFails(
        anonymous.firestore().collection("consents").doc("anonymous").set({
          userId: "guest",
          documents: ["termos", "privacidade"],
          termsVersion: "1.0",
          flow: "cadastro",
          acceptedAt: 1,
          userAgent: "test-agent",
          termsHash: "docfacil-terms-v1.0",
        })
      );
    });
  });

  describe("server-only collections", () => {
    it("blocks client access to access_links, generation_requests and orders write", async () => {
      const alice = testEnv.authenticatedContext("alice");
      await assertFails(alice.firestore().collection("access_links").doc("hash").get());
      await assertFails(
        alice.firestore().collection("access_links").doc("hash").set({ active: true })
      );
      await assertFails(alice.firestore().collection("generation_requests").doc("req").get());
      await assertFails(
        alice.firestore().collection("generation_requests").doc("req").set({ status: "completed" })
      );
      await assertFails(
        alice.firestore().collection("orders").add({
          product: "avulso",
          amountCents: 990,
        })
      );
    });
  });
});
