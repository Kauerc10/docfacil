import "server-only";
import { randomUUID } from "crypto";
import type {
  IDocumentsRepository,
  IAccessRepository,
  IOrdersRepository,
  IGenerationRequestsRepository,
  IUsersRepository,
} from "./interfaces";
import type {
  DocumentRecord,
  DocumentArtifactRecord,
  AccessLinkRecord,
  GenerationRequestRecord,
  OrderRecord,
  ArtifactState,
} from "../domain/documents";

export class InMemoryDocumentsRepository implements IDocumentsRepository {
  private readonly docs = new Map<string, DocumentRecord>();
  private readonly artifacts = new Map<string, Map<number, DocumentArtifactRecord>>();

  public async createDocument(data: Omit<DocumentRecord, "id">): Promise<DocumentRecord> {
    const id = `doc_${randomUUID().replace(/-/g, "")}`;
    const doc: DocumentRecord = { ...data, id };
    this.docs.set(id, doc);
    return doc;
  }

  public async getDocument(documentId: string): Promise<DocumentRecord | null> {
    const doc = this.docs.get(documentId);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  public async updateDocumentRespostas(
    documentId: string,
    respostas: Record<string, string>,
    targetVersion: number
  ): Promise<void> {
    const doc = this.docs.get(documentId);
    if (doc) {
      doc.respostas = { ...respostas };
      doc.targetVersion = targetVersion;
      doc.updatedAt = Date.now();
    }
  }

  public async setArtifactState(
    documentId: string,
    state: ArtifactState,
    error?: { code: string; at: number }
  ): Promise<void> {
    const doc = this.docs.get(documentId);
    if (doc) {
      doc.artifactState = state;
      if (error) {
        doc.lastGenerationError = error;
      }
      doc.updatedAt = Date.now();
    }
  }

  public async promoteCurrentVersion(documentId: string, version: number): Promise<void> {
    const doc = this.docs.get(documentId);
    if (doc) {
      doc.currentVersion = version;
      doc.artifactState = "ready";
      doc.updatedAt = Date.now();
    }
  }

  public async saveArtifact(
    documentId: string,
    artifact: DocumentArtifactRecord
  ): Promise<void> {
    if (!this.artifacts.has(documentId)) {
      this.artifacts.set(documentId, new Map());
    }
    this.artifacts.get(documentId)!.set(artifact.version, { ...artifact });
  }

  public async getArtifact(
    documentId: string,
    version: number
  ): Promise<DocumentArtifactRecord | null> {
    const docArtifacts = this.artifacts.get(documentId);
    if (!docArtifacts) return null;
    const art = docArtifacts.get(version);
    return art ? JSON.parse(JSON.stringify(art)) : null;
  }

  public async listArtifacts(documentId: string): Promise<DocumentArtifactRecord[]> {
    const docArtifacts = this.artifacts.get(documentId);
    if (!docArtifacts) return [];
    return Array.from(docArtifacts.values()).sort((a, b) => a.version - b.version);
  }

  public async deleteDocumentAndArtifacts(documentId: string): Promise<void> {
    this.docs.delete(documentId);
    this.artifacts.delete(documentId);
  }

  public async countUserMonthlyDocuments(
    userId: string,
    startOfMonthTimestamp: number
  ): Promise<number> {
    let count = 0;
    for (const doc of this.docs.values()) {
      if (
        doc.owner.type === "user" &&
        doc.owner.userId === userId &&
        doc.createdAt >= startOfMonthTimestamp
      ) {
        count++;
      }
    }
    return count;
  }
}

export class InMemoryAccessRepository implements IAccessRepository {
  private readonly links = new Map<string, AccessLinkRecord>();

  public async createAccessLink(link: AccessLinkRecord): Promise<void> {
    this.links.set(link.tokenHash, { ...link });
  }

  public async getAccessLink(tokenHash: string): Promise<AccessLinkRecord | null> {
    const link = this.links.get(tokenHash);
    return link ? JSON.parse(JSON.stringify(link)) : null;
  }

  public async findActiveShareLink(
    documentId: string,
    userId: string
  ): Promise<AccessLinkRecord | null> {
    for (const link of this.links.values()) {
      if (
        link.documentId === documentId &&
        link.kind === "share" &&
        link.active &&
        link.createdByUserId === userId
      ) {
        return JSON.parse(JSON.stringify(link));
      }
    }
    return null;
  }

  public async revokeAccessLink(tokenHash: string): Promise<void> {
    const link = this.links.get(tokenHash);
    if (link) {
      link.active = false;
      link.revokedAt = Date.now();
    }
  }

  public async revokeDocumentShareLinks(documentId: string): Promise<void> {
    const now = Date.now();
    for (const link of this.links.values()) {
      if (link.documentId === documentId && link.kind === "share" && link.active) {
        link.active = false;
        link.revokedAt = now;
      }
    }
  }
}

export class InMemoryOrdersRepository implements IOrdersRepository {
  private readonly orders = new Map<string, OrderRecord>();

  public async createOrder(order: Omit<OrderRecord, "id">): Promise<OrderRecord> {
    const id = `ord_${randomUUID().replace(/-/g, "")}`;
    const record: OrderRecord = { ...order, id };
    this.orders.set(id, record);
    return record;
  }

  public async getOrder(orderId: string): Promise<OrderRecord | null> {
    const order = this.orders.get(orderId);
    return order ? JSON.parse(JSON.stringify(order)) : null;
  }

  public async markOrderPaid(orderId: string): Promise<OrderRecord> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    order.status = "paid";
    order.paidAt = Date.now();
    return JSON.parse(JSON.stringify(order));
  }

  public async consumeOrder(orderId: string, documentId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = "consumed";
      order.documentId = documentId;
      order.consumedAt = Date.now();
    }
  }
}

export class InMemoryGenerationRequestsRepository
  implements IGenerationRequestsRepository
{
  private readonly requests = new Map<string, GenerationRequestRecord>();

  public async getOrCreateRequest(
    requestId: string,
    initData: Omit<
      GenerationRequestRecord,
      "requestId" | "status" | "createdAt" | "updatedAt" | "expiresAt"
    >
  ): Promise<{ request: GenerationRequestRecord; isNew: boolean }> {
    const existing = this.requests.get(requestId);
    if (existing) {
      return { request: JSON.parse(JSON.stringify(existing)), isNew: false };
    }

    const now = Date.now();
    const newRecord: GenerationRequestRecord = {
      ...initData,
      requestId,
      status: "processing",
      createdAt: now,
      updatedAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    };

    this.requests.set(requestId, newRecord);
    return { request: JSON.parse(JSON.stringify(newRecord)), isNew: true };
  }

  public async getRequest(
    requestId: string
  ): Promise<GenerationRequestRecord | null> {
    const req = this.requests.get(requestId);
    return req ? JSON.parse(JSON.stringify(req)) : null;
  }

  public async markCompleted(
    requestId: string,
    data: {
      documentId: string;
      targetVersion: number;
      guestAccessPath?: string;
    }
  ): Promise<void> {
    const req = this.requests.get(requestId);
    if (req) {
      req.status = "completed";
      req.documentId = data.documentId;
      req.targetVersion = data.targetVersion;
      req.result = data.guestAccessPath ? { guestAccessPath: data.guestAccessPath } : undefined;
      req.updatedAt = Date.now();
    }
  }

  public async markFailed(requestId: string, errorCode: string): Promise<void> {
    const req = this.requests.get(requestId);
    if (req) {
      req.status = "failed";
      req.errorCode = errorCode;
      req.updatedAt = Date.now();
    }
  }
}

export class InMemoryUsersRepository implements IUsersRepository {
  private readonly users = new Map<
    string,
    { plano?: string; email?: string; nome?: string }
  >();

  public setUser(
    userId: string,
    profile: { plano?: string; email?: string; nome?: string }
  ): void {
    this.users.set(userId, { ...profile });
  }

  public async getUserProfile(
    userId: string
  ): Promise<{ plano?: string; email?: string; nome?: string } | null> {
    const u = this.users.get(userId);
    return u ? JSON.parse(JSON.stringify(u)) : null;
  }
}
