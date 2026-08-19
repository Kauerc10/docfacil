import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  FirestoreDocumentsRepository,
  FirestoreGenerationCommitRepository,
} from "@/lib/server/firestore/repositories";
import { configureAdminFirestore } from "@/lib/server/firebase-admin";

const RUN_FIRESTORE_COMMIT_TESTS =
  process.env.RUN_FIRESTORE_COMMIT_TESTS === "true";

describe.skipIf(!RUN_FIRESTORE_COMMIT_TESTS)(
  "FirestoreGenerationCommitRepository",
  () => {
    let app: App;
    let db: Firestore;
    let documentsRepository: FirestoreDocumentsRepository;
    let repository: FirestoreGenerationCommitRepository;

    beforeAll(() => {
      app = initializeApp(
        { projectId: "demo-docfacil-generation-commit" },
        "generation-commit-emulator-test"
      );
      db = configureAdminFirestore(getFirestore(app));
      documentsRepository = new FirestoreDocumentsRepository(db);
      repository = new FirestoreGenerationCommitRepository(db);
    });

    beforeEach(async () => {
      const collections = [
        "documents",
        "orders",
        "generation_requests",
        "access_links",
      ];

      for (const collectionName of collections) {
        const snapshot = await db.collection(collectionName).get();
        const batch = db.batch();

        for (const document of snapshot.docs) {
          batch.delete(document.ref);
        }

        await batch.commit();
      }
    });

    afterAll(async () => {
      await deleteApp(app);
    });

    it("persists a free document when optional orderId is undefined", async () => {
      const now = Date.now();
      const created = await documentsRepository.createDocument({
        owner: { type: "user", userId: "user-free" },
        modeloSlug: "declaracao-residencia",
        modeloNome: "Declaração de Residência",
        respostas: {},
        entitlement: {
          type: "free",
          orderId: undefined,
          watermarked: true,
        },
        artifactState: "generating",
        currentVersion: null,
        targetVersion: 1,
        createdAt: now,
        updatedAt: now,
      });

      const snapshot = await db.collection("documents").doc(created.id!).get();
      expect(snapshot.exists).toBe(true);
      expect(snapshot.data()?.entitlement).toEqual({
        type: "free",
        watermarked: true,
      });
    });

    it(
      "commits artifact, reserved order, guest access and generation request atomically",
      async () => {
        const fixtureId = crypto.randomUUID();
        const documentId = `doc-transaction-ordering-${fixtureId}`;
        const orderId = `order-transaction-ordering-${fixtureId}`;
        const requestId = `request-transaction-ordering-${fixtureId}`;
        const tokenHash = `token-hash-transaction-ordering-${fixtureId}`;
        const now = Date.now();

        await db.collection("documents").doc(documentId).set({
          id: documentId,
          owner: {
            type: "guest",
            contact: { email: "guest@example.com" },
          },
          modeloSlug: "declaracao-residencia",
          modeloNome: "Declaração de Residência",
          respostas: {},
          entitlement: {
            type: "single_purchase",
            orderId,
            watermarked: false,
          },
          artifactState: "generating",
          currentVersion: null,
          targetVersion: 1,
          createdAt: now,
          updatedAt: now,
        });

        await db.collection("orders").doc(orderId).set({
          id: orderId,
          provider: "demo",
          product: "avulso",
          amountCents: 990,
          buyer: {
            type: "guest",
            email: "guest@example.com",
          },
          status: "reserved",
          reservedByRequestId: requestId,
          reservedAt: now,
          createdAt: now,
        });

        await db.collection("generation_requests").doc(requestId).set({
          requestId,
          operation: "initial",
          principalKey: "guest:test-fingerprint",
          documentId,
          targetVersion: 1,
          status: "processing",
          createdAt: now,
          updatedAt: now,
          expiresAt: now + 60_000,
        });

        await repository.commitGeneratedArtifact({
          requestId,
          documentId,
          targetVersion: 1,
          respostas: {
            declarante_nome: "Maria Teste",
          },
          artifact: {
            version: 1,
            objectKey: `${documentId}/v1/document.pdf`,
            sha256: "a".repeat(64),
            sizeBytes: 1024,
            mimeType: "application/pdf",
            filename: "declaracao-residencia.pdf",
            watermarked: false,
            sourceHash: "b".repeat(64),
            modelSnapshotHash: "c".repeat(64),
            generatedAt: now,
          },
          singlePurchase: {
            orderId,
            requestId,
          },
          guestAccess: {
            tokenHash,
          },
          guestAccessPath: "/d/test-token",
          now,
        });

        const documentSnapshot = await db
          .collection("documents")
          .doc(documentId)
          .get();

        const artifactSnapshot = await db
          .collection("documents")
          .doc(documentId)
          .collection("artifacts")
          .doc("1")
          .get();

        const orderSnapshot = await db
          .collection("orders")
          .doc(orderId)
          .get();

        const requestSnapshot = await db
          .collection("generation_requests")
          .doc(requestId)
          .get();

        const accessSnapshot = await db
          .collection("access_links")
          .doc(tokenHash)
          .get();

        expect(documentSnapshot.data()?.currentVersion).toBe(1);
        expect(documentSnapshot.data()?.artifactState).toBe("ready");
        expect(artifactSnapshot.exists).toBe(true);
        expect(artifactSnapshot.data()).toMatchObject({
          version: 1,
          objectKey: `${documentId}/v1/document.pdf`,
          sha256: "a".repeat(64),
          sizeBytes: 1024,
          mimeType: "application/pdf",
          filename: "declaracao-residencia.pdf",
          watermarked: false,
          sourceHash: "b".repeat(64),
          modelSnapshotHash: "c".repeat(64),
          generatedAt: now,
        });
        expect(orderSnapshot.data()?.status).toBe("consumed");
        expect(orderSnapshot.data()?.documentId).toBe(documentId);
        expect(requestSnapshot.data()?.status).toBe("completed");
        expect(requestSnapshot.data()?.result?.guestAccessPath).toBe(
          "/d/test-token"
        );
        expect(accessSnapshot.exists).toBe(true);
        expect(accessSnapshot.data()?.active).toBe(true);
        expect(accessSnapshot.data()?.documentId).toBe(documentId);
        expect(accessSnapshot.data()?.version).toBe(1);
      }
    );
  }
);
