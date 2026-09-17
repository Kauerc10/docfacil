import "server-only";
import type { DocumentStore } from "./document-store";
import type {
  DocumentRecord,
  DocumentArtifactRecord,
  AccessLinkRecord,
  GenerationRequestRecord,
  OrderRecord,
  ArtifactState,
} from "../domain/documents";
import type { CommitGeneratedArtifactInput } from "./interfaces";
import {
  InMemoryDocumentsRepository,
  InMemoryAccessRepository,
  InMemoryOrdersRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryUsersRepository,
  InMemoryGenerationCommitRepository,
} from "./in-memory-repositories";

export class InMemoryDocumentStore implements DocumentStore {
  public readonly documents: InMemoryDocumentsRepository;
  public readonly access: InMemoryAccessRepository;
  public readonly orders: InMemoryOrdersRepository;
  public readonly generationRequests: InMemoryGenerationRequestsRepository;
  public readonly users: InMemoryUsersRepository;
  public readonly generationCommit: InMemoryGenerationCommitRepository;

  constructor(isolated = true) {
    this.documents = new InMemoryDocumentsRepository(isolated);
    this.access = new InMemoryAccessRepository(isolated);
    this.orders = new InMemoryOrdersRepository(isolated);
    this.generationRequests = new InMemoryGenerationRequestsRepository(isolated);
    this.users = new InMemoryUsersRepository(isolated);
    this.generationCommit = new InMemoryGenerationCommitRepository(
      this.documents,
      this.access,
      this.orders,
      this.generationRequests
    );
  }

  // Idempotency & Generation Requests
  public async getOrCreateGenerationRequest(
    requestId: string,
    initData: Omit<
      GenerationRequestRecord,
      "requestId" | "status" | "createdAt" | "updatedAt" | "expiresAt"
    >
  ): Promise<{ request: GenerationRequestRecord; isNew: boolean }> {
    return this.generationRequests.getOrCreateRequest(requestId, initData);
  }

  public async getGenerationRequest(requestId: string): Promise<GenerationRequestRecord | null> {
    return this.generationRequests.getRequest(requestId);
  }

  public async markGenerationCompleted(
    requestId: string,
    data: {
      documentId: string;
      targetVersion: number;
      guestAccessPath?: string;
    }
  ): Promise<void> {
    return this.generationRequests.markCompleted(requestId, data);
  }

  public async markGenerationFailed(requestId: string, errorCode: string): Promise<void> {
    return this.generationRequests.markFailed(requestId, errorCode);
  }

  // Documents & Artifacts
  public async createDocument(data: Omit<DocumentRecord, "id">): Promise<DocumentRecord> {
    return this.documents.createDocument(data);
  }

  public async getDocument(documentId: string): Promise<DocumentRecord | null> {
    return this.documents.getDocument(documentId);
  }

  public async listUserDocuments(userId: string): Promise<DocumentRecord[]> {
    return this.documents.listUserDocuments(userId);
  }

  public async updateDocumentRespostas(
    documentId: string,
    respostas: Record<string, string>,
    targetVersion: number
  ): Promise<void> {
    return this.documents.updateDocumentRespostas(documentId, respostas, targetVersion);
  }

  public async setArtifactState(
    documentId: string,
    state: ArtifactState,
    error?: { code: string; at: number }
  ): Promise<void> {
    return this.documents.setArtifactState(documentId, state, error);
  }

  public async reserveNextVersion(documentId: string, requestId: string): Promise<number> {
    return this.documents.reserveNextVersion(documentId, requestId);
  }

  public async promoteCurrentVersion(documentId: string, version: number): Promise<void> {
    return this.documents.promoteCurrentVersion(documentId, version);
  }

  public async saveArtifact(documentId: string, artifact: DocumentArtifactRecord): Promise<void> {
    return this.documents.saveArtifact(documentId, artifact);
  }

  public async getArtifact(
    documentId: string,
    version: number
  ): Promise<DocumentArtifactRecord | null> {
    return this.documents.getArtifact(documentId, version);
  }

  public async listArtifacts(documentId: string): Promise<DocumentArtifactRecord[]> {
    return this.documents.listArtifacts(documentId);
  }

  public async deleteDocumentAndArtifacts(documentId: string): Promise<void> {
    return this.documents.deleteDocumentAndArtifacts(documentId);
  }

  public async markDocumentDeleted(documentId: string, pendingPurge: boolean): Promise<void> {
    return this.documents.markDocumentDeleted(documentId, pendingPurge);
  }

  public async countUserMonthlyDocuments(
    userId: string,
    startOfMonthTimestamp: number
  ): Promise<number> {
    return this.documents.countUserMonthlyDocuments(userId, startOfMonthTimestamp);
  }

  // Access & Share Links
  public async createAccessLink(link: AccessLinkRecord): Promise<void> {
    return this.access.createAccessLink(link);
  }

  public async getAccessLink(tokenHash: string): Promise<AccessLinkRecord | null> {
    return this.access.getAccessLink(tokenHash);
  }

  public async findActiveShareLink(
    documentId: string,
    userId: string
  ): Promise<AccessLinkRecord | null> {
    return this.access.findActiveShareLink(documentId, userId);
  }

  public async revokeAccessLink(tokenHash: string): Promise<void> {
    return this.access.revokeAccessLink(tokenHash);
  }

  public async revokeDocumentShareLinks(documentId: string): Promise<void> {
    return this.access.revokeDocumentShareLinks(documentId);
  }

  public async recordAccess(tokenHash: string): Promise<void> {
    return this.access.recordAccess(tokenHash);
  }

  // Orders
  public async createOrder(order: Omit<OrderRecord, "id">): Promise<OrderRecord> {
    return this.orders.createOrder(order);
  }

  public async getOrder(orderId: string): Promise<OrderRecord | null> {
    return this.orders.getOrder(orderId);
  }

  public async markOrderPaid(orderId: string): Promise<OrderRecord> {
    return this.orders.markOrderPaid(orderId);
  }

  public async consumeOrder(orderId: string, documentId: string): Promise<void> {
    return this.orders.consumeOrder(orderId, documentId);
  }

  public async reservePaidOrder(params: {
    orderId: string;
    requestId: string;
    principalKey: string;
  }): Promise<OrderRecord> {
    return this.orders.reservePaidOrder(params);
  }

  public async consumeReservedOrder(params: {
    orderId: string;
    requestId: string;
    documentId: string;
  }): Promise<void> {
    return this.orders.consumeReservedOrder(params);
  }

  public async releaseReservedOrder(params: {
    orderId: string;
    requestId: string;
  }): Promise<void> {
    return this.orders.releaseReservedOrder(params);
  }

  // User Profiles
  public async getUserProfile(
    userId: string
  ): Promise<{ plano?: string; email?: string; nome?: string } | null> {
    return this.users.getUserProfile(userId);
  }

  public setUserProfile(
    userId: string,
    profile: { plano?: string; email?: string; nome?: string }
  ): void {
    this.users.setUserProfile(userId, profile);
  }

  // Coarse-grained Atomic Transaction
  public async commitGeneratedArtifact(
    input: CommitGeneratedArtifactInput
  ): Promise<void> {
    return this.generationCommit.commitGeneratedArtifact(input);
  }

  // Testing hook for fault injection
  public failNextCommit(error: Error): void {
    this.generationCommit.failNextCommit(error);
  }
}
