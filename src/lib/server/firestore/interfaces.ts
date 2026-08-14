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

export interface IUsersRepository {
  getUserProfile(
    userId: string
  ): Promise<{ plano?: string; email?: string; nome?: string } | null>;
}
