import { describe, expect, it, beforeEach } from "bun:test";
import {
  InMemoryDocumentsRepository,
  InMemoryAccessRepository,
  InMemoryOrdersRepository,
  InMemoryGenerationRequestsRepository,
} from "./in-memory-repositories";
import type {
  DocumentRecord,
  DocumentArtifactRecord,
  AccessLinkRecord,
} from "../domain/documents";

describe("DocumentsRepository", () => {
  let repo: InMemoryDocumentsRepository;

  beforeEach(() => {
    repo = new InMemoryDocumentsRepository();
  });

  it("creates a document, saves artifact and promotes version only on final step", async () => {
    const docData: Omit<DocumentRecord, "id"> = {
      owner: { type: "user", userId: "usr_1" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: { declarante_nome: "Maria" },
      entitlement: { type: "free", watermarked: true },
      artifactState: "generating",
      currentVersion: null,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const doc = await repo.createDocument(docData);
    expect(doc.id).toBeDefined();
    expect(doc.currentVersion).toBeNull();
    expect(doc.artifactState).toBe("generating");

    // Save artifact v1
    const artifact: DocumentArtifactRecord = {
      version: 1,
      objectKey: `documents/${doc.id}/v1/document.pdf`,
      sha256: "abc123sha",
      sizeBytes: 1234,
      mimeType: "application/pdf",
      filename: "declaracao.pdf",
      watermarked: true,
      sourceHash: "src123",
      modelSnapshotHash: "mod123",
      generatedAt: Date.now(),
    };

    await repo.saveArtifact(doc.id!, artifact);
    const retrievedArtifact = await repo.getArtifact(doc.id!, 1);
    expect(retrievedArtifact).toEqual(artifact);

    // Document currentVersion is still null before promotion
    const beforePromotion = await repo.getDocument(doc.id!);
    expect(beforePromotion?.currentVersion).toBeNull();

    // Promote to v1
    await repo.promoteCurrentVersion(doc.id!, 1);
    const afterPromotion = await repo.getDocument(doc.id!);
    expect(afterPromotion?.currentVersion).toBe(1);
    expect(afterPromotion?.artifactState).toBe("ready");
  });

  it("preserves owner when answers are updated for a new version", async () => {
    const doc = await repo.createDocument({
      owner: { type: "user", userId: "usr_owner" },
      modeloSlug: "contrato-locacao",
      modeloNome: "Contrato de Locação",
      respostas: { valor: "1000" },
      entitlement: { type: "pro", watermarked: false },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: 100,
      updatedAt: 100,
    });

    await repo.updateDocumentRespostas(doc.id!, { valor: "1200" }, 2);

    const updated = await repo.getDocument(doc.id!);
    expect(updated?.owner).toEqual({ type: "user", userId: "usr_owner" });
    expect(updated?.respostas.valor).toBe("1200");
    expect(updated?.targetVersion).toBe(2);
    // currentVersion remains 1 until v2 promotion
    expect(updated?.currentVersion).toBe(1);
  });

  it("counts user monthly documents created within the given timeframe", async () => {
    const now = Date.now();
    const startOfMonth = now - 1000 * 60 * 60 * 24 * 5; // 5 days ago

    await repo.createDocument({
      owner: { type: "user", userId: "usr_count" },
      modeloSlug: "m1",
      modeloNome: "M1",
      respostas: {},
      entitlement: { type: "free", watermarked: true },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: now,
      updatedAt: now,
    });

    await repo.createDocument({
      owner: { type: "user", userId: "usr_count" },
      modeloSlug: "m2",
      modeloNome: "M2",
      respostas: {},
      entitlement: { type: "free", watermarked: true },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: startOfMonth - 1000, // previous month
      updatedAt: startOfMonth - 1000,
    });

    const count = await repo.countUserMonthlyDocuments("usr_count", startOfMonth);
    expect(count).toBe(1);
  });
});

describe("AccessRepository", () => {
  let repo: InMemoryAccessRepository;

  beforeEach(() => {
    repo = new InMemoryAccessRepository();
  });

  it("creates access link, retrieves it and revokes it", async () => {
    const link: AccessLinkRecord = {
      tokenHash: "hash_test_123",
      kind: "share",
      documentId: "doc_100",
      version: 1,
      active: true,
      createdByUserId: "usr_100",
      createdAt: Date.now(),
    };

    await repo.createAccessLink(link);
    const retrieved = await repo.getAccessLink("hash_test_123");
    expect(retrieved?.active).toBe(true);

    await repo.revokeAccessLink("hash_test_123");
    const revoked = await repo.getAccessLink("hash_test_123");
    expect(revoked?.active).toBe(false);
    expect(revoked?.revokedAt).toBeDefined();
  });
});

describe("OrdersRepository", () => {
  let repo: InMemoryOrdersRepository;

  beforeEach(() => {
    repo = new InMemoryOrdersRepository();
  });

  it("creates, pays and consumes order once", async () => {
    const order = await repo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    expect(order.id).toBeDefined();
    expect(order.status).toBe("pending");

    const paid = await repo.markOrderPaid(order.id!);
    expect(paid.status).toBe("paid");
    expect(paid.paidAt).toBeDefined();

    await repo.consumeOrder(order.id!, "doc_123");
    const consumed = await repo.getOrder(order.id!);
    expect(consumed?.status).toBe("consumed");
    expect(consumed?.documentId).toBe("doc_123");
    expect(consumed?.consumedAt).toBeDefined();
  });
});

describe("GenerationRequestsRepository (Idempotency)", () => {
  let repo: InMemoryGenerationRequestsRepository;

  beforeEach(() => {
    repo = new InMemoryGenerationRequestsRepository();
  });

  it("guarantees atomic getOrCreate for idempotency key", async () => {
    const initData = {
      operation: "initial" as const,
      principalKey: "guest:maria@example.com",
      documentId: "doc_temp_1",
      targetVersion: 1,
    };

    const first = await repo.getOrCreateRequest("req_uuid_1", initData);
    expect(first.isNew).toBe(true);
    expect(first.request.status).toBe("processing");

    // Second call with same requestId returns existing without duplicating
    const second = await repo.getOrCreateRequest("req_uuid_1", initData);
    expect(second.isNew).toBe(false);
    expect(second.request.requestId).toBe("req_uuid_1");

    await repo.markCompleted("req_uuid_1", {
      documentId: "doc_temp_1",
      targetVersion: 1,
      guestAccessPath: "/d/token123",
    });
    const completed = await repo.getRequest("req_uuid_1");
    expect(completed?.status).toBe("completed");
    expect(completed?.result?.guestAccessPath).toBe("/d/token123");
  });

  it("reclaims an expired processing request so the same idempotency key can retry", async () => {
    const originalNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => now;

    try {
      const initData = {
        operation: "initial" as const,
        principalKey: "guest:retryable",
        documentId: "pending",
        targetVersion: 1,
      };

      await repo.getOrCreateRequest("req_expired", initData);
      now += 24 * 60 * 60 * 1000 + 1;

      const reclaimed = await repo.getOrCreateRequest("req_expired", initData);

      expect(reclaimed.isNew).toBe(true);
      expect(reclaimed.request.status).toBe("processing");
      expect(reclaimed.request.expiresAt).toBe(now + 24 * 60 * 60 * 1000);
    } finally {
      Date.now = originalNow;
    }
  });
});
