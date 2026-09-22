import "server-only";
import type {
  DocumentRecord,
  DocumentArtifactRecord,
  AccessLinkRecord,
  GenerationRequestRecord,
  OrderRecord,
  ArtifactState,
} from "../domain/documents";

export interface IDocumentsRepository {
  createDocument(data: Omit<DocumentRecord, "id">): Promise<DocumentRecord>;
  getDocument(documentId: string): Promise<DocumentRecord | null>;
  listUserDocuments(userId: string): Promise<DocumentRecord[]>;
  updateDocumentRespostas(
    documentId: string,
    respostas: Record<string, string>,
    targetVersion: number
  ): Promise<void>;
  setArtifactState(
    documentId: string,
    state: ArtifactState,
    error?: { code: string; at: number }
  ): Promise<void>;
  reserveNextVersion(documentId: string, requestId: string): Promise<number>;
  promoteCurrentVersion(documentId: string, version: number): Promise<void>;
  saveArtifact(documentId: string, artifact: DocumentArtifactRecord): Promise<void>;
  getArtifact(documentId: string, version: number): Promise<DocumentArtifactRecord | null>;
  listArtifacts(documentId: string): Promise<DocumentArtifactRecord[]>;
  deleteDocumentAndArtifacts(documentId: string): Promise<void>;
  markDocumentDeleted(documentId: string, pendingPurge: boolean): Promise<void>;
  countUserMonthlyDocuments(
    userId: string,
    startOfMonthTimestamp: number
  ): Promise<number>;
}

export interface IAccessRepository {
  createAccessLink(link: AccessLinkRecord): Promise<void>;
  getAccessLink(tokenHash: string): Promise<AccessLinkRecord | null>;
  findActiveShareLink(
    documentId: string,
    userId: string
  ): Promise<AccessLinkRecord | null>;
  revokeAccessLink(tokenHash: string): Promise<void>;
  revokeDocumentShareLinks(documentId: string): Promise<void>;
  recordAccess(tokenHash: string): Promise<void>;
}

export interface IOrdersRepository {
  createOrder(order: Omit<OrderRecord, "id">): Promise<OrderRecord>;
  getOrder(orderId: string): Promise<OrderRecord | null>;
  markOrderPaid(orderId: string): Promise<OrderRecord>;
  consumeOrder(orderId: string, documentId: string): Promise<void>;
  reservePaidOrder(params: {
    orderId: string;
    requestId: string;
    principalKey: string;
  }): Promise<OrderRecord>;
  consumeReservedOrder(params: {
    orderId: string;
    requestId: string;
    documentId: string;
  }): Promise<void>;
  releaseReservedOrder(params: {
    orderId: string;
    requestId: string;
  }): Promise<void>;
  updateOrder(orderId: string, updates: Partial<OrderRecord>): Promise<OrderRecord>;
}

export interface IWebhookEventsRepository {
  claim(eventId: string, now: number): Promise<boolean>;
  complete(eventId: string, now: number): Promise<void>;
  release(eventId: string): Promise<void>;
}

export interface IGenerationRequestsRepository {
  getOrCreateRequest(
    requestId: string,
    initData: Omit<
      GenerationRequestRecord,
      "requestId" | "status" | "createdAt" | "updatedAt" | "expiresAt"
    >
  ): Promise<{ request: GenerationRequestRecord; isNew: boolean }>;
  getRequest(requestId: string): Promise<GenerationRequestRecord | null>;
  markCompleted(
    requestId: string,
    data: {
      documentId: string;
      targetVersion: number;
      guestAccessPath?: string;
    }
  ): Promise<void>;
  markFailed(requestId: string, errorCode: string): Promise<void>;
}

export interface UserProfileRecord {
  plano?: string;
  email?: string;
  nome?: string;
  subscriptionId?: string | null;
  subscriptionOrderId?: string | null;
  pendingProOrderId?: string | null;
  subscriptionStatus?: "active" | "cancelled";
  subscriptionExpiresAt?: number | null;
  cancelledAt?: number | null;
}

export type ReservePendingProSubscriptionResult =
  | { status: "active_pro" }
  | { status: "existing_pending"; orderId: string }
  | { status: "acquired" };

export interface IUsersRepository {
  getUserProfile(
    userId: string
  ): Promise<UserProfileRecord | null>;
  reservePendingProSubscription(
    userId: string,
    orderId: string
  ): Promise<ReservePendingProSubscriptionResult>;
  releasePendingProSubscription(
    userId: string,
    orderId: string
  ): Promise<void>;
}

export interface CommitGeneratedArtifactInput {
  requestId: string;
  documentId: string;
  targetVersion: number;
  respostas: Record<string, string>;
  artifact: DocumentArtifactRecord;
  singlePurchase?: {
    orderId: string;
    requestId: string;
  };
  guestAccess?: {
    tokenHash: string;
  };
  guestAccessPath?: string;
  freeQuota?: {
    userId: string;
    startOfMonthTimestamp: number;
    initialCount: number;
    limit: number;
  };
  now: number;
}

export interface IGenerationCommitRepository {
  commitGeneratedArtifact(
    input: CommitGeneratedArtifactInput
  ): Promise<void>;
}
