import "server-only";
import { randomUUID } from "crypto";
import type {
  IDocumentsRepository,
  IAccessRepository,
  IOrdersRepository,
  IGenerationRequestsRepository,
  IUsersRepository,
  IGenerationCommitRepository,
  CommitGeneratedArtifactInput,
} from "./interfaces";
import type {
  DocumentRecord,
  DocumentArtifactRecord,
  AccessLinkRecord,
  GenerationRequestRecord,
  OrderRecord,
  ArtifactState,
} from "../domain/documents";
import { BackendError } from "../errors";
import { createOrderBuyerPrincipalKey } from "../billing/order-identity";

/**
 * globalThis store — garante que page.tsx (Server Component) e API routes
 * compartilhem os mesmos Maps no mesmo processo Node.js quando
 * ALLOW_IN_MEMORY_REPOSITORIES=true. Sem isso, o Next.js App Router pode
 * instanciar o módulo em contextos isolados e os dados não persistem entre
 * chamadas.
 */
declare global {
  // eslint-disable-next-line no-var
  var __inMemoryStore: {
    docs: Map<string, DocumentRecord>;
    artifacts: Map<string, Map<number, DocumentArtifactRecord>>;
    accessLinks: Map<string, AccessLinkRecord>;
    orders: Map<string, OrderRecord>;
    generationRequests: Map<string, GenerationRequestRecord>;
    users: Map<string, { plano?: string; email?: string; nome?: string }>;
  } | undefined;
}

function getStore() {
  if (!globalThis.__inMemoryStore) {
    globalThis.__inMemoryStore = {
      docs: new Map(),
      artifacts: new Map(),
      accessLinks: new Map(),
      orders: new Map(),
      generationRequests: new Map(),
      users: new Map(),
    };
  }
  return globalThis.__inMemoryStore;
}

/** Reseta o store global (útil em testes que usam getRepositories diretamente). */
export function resetInMemoryStore(): void {
  globalThis.__inMemoryStore = undefined;
}

export class InMemoryDocumentsRepository implements IDocumentsRepository {
  private readonly _docs: Map<string, DocumentRecord> | null;
  private readonly _artifacts: Map<string, Map<number, DocumentArtifactRecord>> | null;

  /**
   * @param isolated Se true (padrão), usa Maps locais isolados (para testes unitários).
   *                 Se false, usa o globalThis store compartilhado (para E2E via getRepositories).
   */
  constructor(isolated = true) {
    this._docs = isolated ? new Map() : null;
    this._artifacts = isolated ? new Map() : null;
  }

  private get docs() { return this._docs ?? getStore().docs; }
  private get artifacts() { return this._artifacts ?? getStore().artifacts; }

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

  public async listUserDocuments(userId: string): Promise<DocumentRecord[]> {
    const list: DocumentRecord[] = [];
    for (const doc of this.docs.values()) {
      if (
        doc.owner.type === "user" &&
        doc.owner.userId === userId &&
        doc.status !== "deleted"
      ) {
        list.push(JSON.parse(JSON.stringify(doc)));
      }
    }
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
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

  public async markDocumentDeleted(documentId: string, pendingPurge: boolean): Promise<void> {
    const doc = this.docs.get(documentId);
    if (doc) {
      doc.status = "deleted";
      doc.deletedAt = Date.now();
      doc.pendingPurge = pendingPurge;
      doc.updatedAt = Date.now();
    }
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
  private readonly _links: Map<string, AccessLinkRecord> | null;

  constructor(isolated = true) {
    this._links = isolated ? new Map() : null;
  }

  private get links() { return this._links ?? getStore().accessLinks; }

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

  public async recordAccess(tokenHash: string): Promise<void> {
    const link = this.links.get(tokenHash);
    if (link) {
      link.accessCount = (link.accessCount || 0) + 1;
      link.lastAccessedAt = Date.now();
    }
  }

  public size(): number {
    return this.links.size;
  }
}

export class InMemoryOrdersRepository implements IOrdersRepository {
  private readonly _orders: Map<string, OrderRecord> | null;

  constructor(isolated = true) {
    this._orders = isolated ? new Map() : null;
  }

  private get orders() { return this._orders ?? getStore().orders; }

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

  public async reservePaidOrder(params: {
    orderId: string;
    requestId: string;
    principalKey: string;
  }): Promise<OrderRecord> {
    const order = this.orders.get(params.orderId);
    if (!order) {
      throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido de compra não encontrado.");
    }

    if (createOrderBuyerPrincipalKey(order.buyer) !== params.principalKey) {
      throw new BackendError(
        "ORDER_FORBIDDEN",
        403,
        "Este pagamento não pertence ao solicitante."
      );
    }

    if (order.status === "reserved" && order.reservedByRequestId === params.requestId) {
      return JSON.parse(JSON.stringify(order));
    }

    if (order.status === "reserved") {
      throw new BackendError(
        "ORDER_ALREADY_RESERVED",
        409,
        "Este pagamento já está sendo processado por outra solicitação."
      );
    }

    if (order.status === "consumed") {
      throw new BackendError(
        "ORDER_ALREADY_CONSUMED",
        409,
        "Este pagamento já foi utilizado para gerar outro documento."
      );
    }

    if (order.status !== "paid") {
      throw new BackendError(
        "ORDER_NOT_PAID",
        402,
        "O pagamento informado ainda não foi confirmado."
      );
    }

    order.status = "reserved";
    order.reservedByRequestId = params.requestId;
    order.reservedAt = Date.now();

    return JSON.parse(JSON.stringify(order));
  }

  public async consumeReservedOrder(params: {
    orderId: string;
    requestId: string;
    documentId: string;
  }): Promise<void> {
    const order = this.orders.get(params.orderId);
    if (order && (order.status === "reserved" || order.status === "paid")) {
      order.status = "consumed";
      order.documentId = params.documentId;
      order.consumedAt = Date.now();
    }
  }

  public async releaseReservedOrder(params: {
    orderId: string;
    requestId: string;
  }): Promise<void> {
    const order = this.orders.get(params.orderId);
    if (order && order.status === "reserved" && order.reservedByRequestId === params.requestId) {
      order.status = "paid";
      delete order.reservedByRequestId;
      delete order.reservedAt;
    }
  }
}

export class InMemoryGenerationRequestsRepository
  implements IGenerationRequestsRepository
{
  private readonly _requests: Map<string, GenerationRequestRecord> | null;

  constructor(isolated = true) {
    this._requests = isolated ? new Map() : null;
  }

  private get requests() { return this._requests ?? getStore().generationRequests; }

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
  private readonly _users: Map<string, { plano?: string; email?: string; nome?: string }> | null;

  constructor(isolated = true) {
    this._users = isolated ? new Map() : null;
  }

  private get users() { return this._users ?? getStore().users; }

  public setUser(
    userId: string,
    profile: { plano?: string; email?: string; nome?: string }
  ): void {
    this.users.set(userId, { ...profile });
  }

  public setUserProfile(
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

export class InMemoryGenerationCommitRepository implements IGenerationCommitRepository {
  private readonly docsRepo: InMemoryDocumentsRepository;
  private readonly accessRepo: InMemoryAccessRepository;
  private readonly ordersRepo: InMemoryOrdersRepository;
  private readonly requestsRepo: InMemoryGenerationRequestsRepository;
  private failNextError: Error | null = null;

  constructor(
    docsRepo: InMemoryDocumentsRepository,
    accessRepo: InMemoryAccessRepository,
    ordersRepo: InMemoryOrdersRepository,
    requestsRepo: InMemoryGenerationRequestsRepository
  ) {
    this.docsRepo = docsRepo;
    this.accessRepo = accessRepo;
    this.ordersRepo = ordersRepo;
    this.requestsRepo = requestsRepo;
  }

  public failNextCommit(err: Error): void {
    this.failNextError = err;
  }

  public async commitGeneratedArtifact(input: CommitGeneratedArtifactInput): Promise<void> {
    if (this.failNextError) {
      const err = this.failNextError;
      this.failNextError = null;
      throw err;
    }

    const doc = await this.docsRepo.getDocument(input.documentId);
    if (!doc) {
      throw new BackendError(
        "DOCUMENT_NOT_FOUND",
        404,
        "Documento não encontrado durante commit da geração."
      );
    }

    if (input.singlePurchase) {
      const order = await this.ordersRepo.getOrder(input.singlePurchase.orderId);
      if (!order) {
        throw new BackendError(
          "ORDER_NOT_FOUND",
          404,
          "Pedido não encontrado durante commit."
        );
      }
      if (order.status !== "reserved" || order.reservedByRequestId !== input.requestId) {
        throw new BackendError(
          "ORDER_ALREADY_RESERVED",
          409,
          "Pedido não está reservado por esta geração."
        );
      }
    }

    // Atomic execution
    await this.docsRepo.saveArtifact(input.documentId, input.artifact);
    await this.docsRepo.updateDocumentRespostas(
      input.documentId,
      input.respostas,
      input.targetVersion
    );
    await this.docsRepo.promoteCurrentVersion(input.documentId, input.targetVersion);
    await this.docsRepo.setArtifactState(input.documentId, "ready");

    if (input.singlePurchase) {
      await this.ordersRepo.consumeReservedOrder({
        orderId: input.singlePurchase.orderId,
        requestId: input.requestId,
        documentId: input.documentId,
      });
    }

    if (input.guestAccess) {
      await this.accessRepo.createAccessLink({
        tokenHash: input.guestAccess.tokenHash,
        kind: "guest",
        documentId: input.documentId,
        version: input.targetVersion,
        active: true,
        createdAt: input.now,
      });
    }

    await this.requestsRepo.markCompleted(input.requestId, {
      documentId: input.documentId,
      targetVersion: input.targetVersion,
      guestAccessPath: input.guestAccessPath,
    });
  }
}
