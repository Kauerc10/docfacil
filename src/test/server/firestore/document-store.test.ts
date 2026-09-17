import { describe, expect, it, beforeEach } from "bun:test";
import {
  DocumentStore,
  getDocumentStore,
  setDocumentStoreForTesting,
} from "@/lib/server/firestore/document-store";
import { InMemoryDocumentStore } from "@/lib/server/firestore/in-memory-document-store";
import { createBuyerFingerprint } from "@/lib/server/billing/order-identity";

describe("DocumentStore Seam", () => {
  let store: InMemoryDocumentStore;

  beforeEach(() => {
    store = new InMemoryDocumentStore();
    setDocumentStoreForTesting(store);
  });

  it("provides singleton access and testing override", () => {
    expect(getDocumentStore()).toBe(store);
    setDocumentStoreForTesting(null);
  });

  it("handles generation request idempotency lifecycle", async () => {
    const initData = {
      operation: "initial" as const,
      principalKey: "guest:anon",
      documentId: "pending",
      targetVersion: 1,
    };

    const first = await store.getOrCreateGenerationRequest("req-123", initData);
    expect(first.isNew).toBe(true);
    expect(first.request.status).toBe("processing");

    const second = await store.getOrCreateGenerationRequest("req-123", initData);
    expect(second.isNew).toBe(false);
    expect(second.request.status).toBe("processing");

    await store.markGenerationCompleted("req-123", {
      documentId: "doc-1",
      targetVersion: 1,
      guestAccessPath: "/d/token123",
    });

    const completed = await store.getGenerationRequest("req-123");
    expect(completed?.status).toBe("completed");
    expect(completed?.result?.guestAccessPath).toBe("/d/token123");
  });

  it("atomically commits generated artifact and related entities", async () => {
    const buyer = { type: "guest" as const, email: "cliente@docfacil.com.br" };
    const order = await store.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer,
      status: "paid",
      createdAt: Date.now(),
    });

    const principalKey = `guest:${createBuyerFingerprint(buyer)}`;

    await store.reservePaidOrder({
      orderId: order.id!,
      requestId: "req-commit-1",
      principalKey,
    });

    const doc = await store.createDocument({
      owner: { type: "guest", contact: { email: "cliente@docfacil.com.br" } },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: { nome: "Kauer" },
      entitlement: { type: "single_purchase", orderId: order.id!, watermarked: false },
      artifactState: "generating",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await store.getOrCreateGenerationRequest("req-commit-1", {
      operation: "initial",
      principalKey,
      documentId: doc.id!,
      targetVersion: 1,
    });

    await store.commitGeneratedArtifact({
      requestId: "req-commit-1",
      documentId: doc.id!,
      targetVersion: 1,
      respostas: { nome: "Kauer" },
      artifact: {
        version: 1,
        objectKey: `documents/${doc.id}/v1/document.pdf`,
        sha256: "hash123",
        sizeBytes: 1024,
        mimeType: "application/pdf",
        filename: "declaracao-residencia.pdf",
        watermarked: false,
        sourceHash: "source-hash-123",
        modelSnapshotHash: "snap-hash-123",
        generatedAt: Date.now(),
      },
      singlePurchase: {
        orderId: order.id!,
        requestId: "req-commit-1",
      },
      guestAccess: {
        tokenHash: "token-hash-xyz",
      },
      guestAccessPath: "/d/token-hash-xyz",
      now: Date.now(),
    });

    // Check document was promoted and artifact saved
    const updatedDoc = await store.getDocument(doc.id!);
    expect(updatedDoc?.artifactState).toBe("ready");
    expect(updatedDoc?.currentVersion).toBe(1);

    const artifact = await store.getArtifact(doc.id!, 1);
    expect(artifact?.sha256).toBe("hash123");

    // Check order was consumed
    const updatedOrder = await store.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("consumed");
    expect(updatedOrder?.documentId).toBe(doc.id);

    // Check guest access link was created
    const accessLink = await store.getAccessLink("token-hash-xyz");
    expect(accessLink).not.toBeNull();
    expect(accessLink?.documentId).toBe(doc.id);
    expect(accessLink?.version).toBe(1);

    // Check request marked completed
    const req = await store.getGenerationRequest("req-commit-1");
    expect(req?.status).toBe("completed");
  });

  it("rolls back atomic commit when failure is triggered", async () => {
    store.failNextCommit(new Error("Simulated Firestore transaction abort"));

    const doc = await store.createDocument({
      owner: { type: "guest", contact: {} },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {},
      entitlement: { type: "free", watermarked: true },
      artifactState: "generating",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    let errorThrown: any = null;
    try {
      await store.commitGeneratedArtifact({
        requestId: "req-fail-1",
        documentId: doc.id!,
        targetVersion: 1,
        respostas: {},
        artifact: {
          version: 1,
          objectKey: "key",
          sha256: "hash",
          sizeBytes: 100,
          mimeType: "application/pdf",
          filename: "doc.pdf",
          watermarked: false,
          sourceHash: "sh",
          modelSnapshotHash: "mh",
          generatedAt: Date.now(),
        },
        now: Date.now(),
      });
    } catch (e) {
      errorThrown = e;
    }

    expect(errorThrown).not.toBeNull();
    expect(errorThrown.message).toContain("Simulated Firestore transaction abort");

    // Document state should not be "ready"
    const docAfter = await store.getDocument(doc.id!);
    expect(docAfter?.artifactState).toBe("generating");

    // Artifact subcollection should be empty
    const artifact = await store.getArtifact(doc.id!, 1);
    expect(artifact).toBeNull();
  });
});
