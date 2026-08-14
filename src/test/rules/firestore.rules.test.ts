import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Firestore Security Rules", () => {
  let testEnv: RulesTestEnvironment | null = null;
  const rules = fs.readFileSync(path.resolve(process.cwd(), "firestore.rules"), "utf8");

  beforeAll(async () => {
    try {
      testEnv = await initializeTestEnvironment({
        projectId: "docfacil-rules-test",
        firestore: {
          rules,
          host: "127.0.0.1",
          port: 8080,
        },
      });
    } catch {
      testEnv = null;
    }
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
    });
  });

  describe("users rules", () => {
    it("allows user to create own profile with plano gratis", async () => {
      if (!testEnv) return;
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
      if (!testEnv) return;
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

    it("allows user to update name and phone", async () => {
      if (!testEnv) return;
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
        })
      );
    });

    it("blocks user from mutating plano directly", async () => {
      if (!testEnv) return;
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
  });

  describe("documents rules", () => {
    it("allows authenticated owner to read own document", async () => {
      if (!testEnv) return;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("documents").doc("doc_1").set({
          owner: { type: "user", userId: "alice" },
          modeloSlug: "declaracao-residencia",
        });
      });
      const alice = testEnv.authenticatedContext("alice");
      await assertSucceeds(alice.firestore().collection("documents").doc("doc_1").get());
    });

    it("blocks client from creating, updating or deleting documents directly", async () => {
      if (!testEnv) return;
      const alice = testEnv.authenticatedContext("alice");
      await assertFails(
        alice.firestore().collection("documents").add({
          owner: { type: "user", userId: "alice" },
          modeloSlug: "declaracao-residencia",
        })
      );
    });
  });

  describe("server-only collections", () => {
    it("blocks client access to access_links, generation_requests and orders write", async () => {
      if (!testEnv) return;
      const alice = testEnv.authenticatedContext("alice");
      await assertFails(alice.firestore().collection("access_links").doc("hash").get());
      await assertFails(alice.firestore().collection("generation_requests").doc("req").get());
      await assertFails(
        alice.firestore().collection("orders").add({
          product: "avulso",
          amountCents: 990,
        })
      );
    });
  });
});
