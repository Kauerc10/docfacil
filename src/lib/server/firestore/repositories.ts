import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";
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
import {
  InMemoryDocumentsRepository,
  InMemoryAccessRepository,
  InMemoryOrdersRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryUsersRepository,
} from "./in-memory-repositories";

export class FirestoreDocumentsRepository implements IDocumentsRepository {
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async createDocument(data: Omit<DocumentRecord, "id">): Promise<DocumentRecord> {
    const docRef = this.db.collection("documents").doc();
    const record: DocumentRecord = {
      ...data,
      id: docRef.id,
    };
    await docRef.set(record);
    return record;
  }

  public async getDocument(documentId: string): Promise<DocumentRecord | null> {
    const snap = await this.db.collection("documents").doc(documentId).get();
    if (!snap.exists) return null;
    return { ...snap.data(), id: snap.id } as DocumentRecord;
  }

  public async updateDocumentRespostas(
    documentId: string,
    respostas: Record<string, string>,
    targetVersion: number
  ): Promise<void> {
    await this.db.collection("documents").doc(documentId).update({
      respostas,
      targetVersion,
      updatedAt: Date.now(),
    });
  }

  public async setArtifactState(
    documentId: string,
    state: ArtifactState,
    error?: { code: string; at: number }
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      artifactState: state,
      updatedAt: Date.now(),
    };
    if (error) {
      updates.lastGenerationError = error;
    }
    await this.db.collection("documents").doc(documentId).update(updates);
  }

  public async promoteCurrentVersion(documentId: string, version: number): Promise<void> {
    await this.db.collection("documents").doc(documentId).update({
      currentVersion: version,
      artifactState: "ready",
      updatedAt: Date.now(),
    });
  }

  public async saveArtifact(
    documentId: string,
    artifact: DocumentArtifactRecord
  ): Promise<void> {
    await this.db
      .collection("documents")
      .doc(documentId)
      .collection("artifacts")
      .doc(String(artifact.version))
      .set(artifact);
  }

  public async getArtifact(
    documentId: string,
    version: number
  ): Promise<DocumentArtifactRecord | null> {
    const snap = await this.db
      .collection("documents")
      .doc(documentId)
      .collection("artifacts")
      .doc(String(version))
      .get();

    if (!snap.exists) return null;
    return snap.data() as DocumentArtifactRecord;
  }

  public async listArtifacts(documentId: string): Promise<DocumentArtifactRecord[]> {
    const snaps = await this.db
      .collection("documents")
      .doc(documentId)
      .collection("artifacts")
      .orderBy("version", "asc")
      .get();

    return snaps.docs.map((d) => d.data() as DocumentArtifactRecord);
  }

  public async deleteDocumentAndArtifacts(documentId: string): Promise<void> {
    const docRef = this.db.collection("documents").doc(documentId);
    const artifactsSnap = await docRef.collection("artifacts").get();

    const batch = this.db.batch();
    for (const art of artifactsSnap.docs) {
      batch.delete(art.ref);
    }
    batch.delete(docRef);
    await batch.commit();
  }

  public async countUserMonthlyDocuments(
    userId: string,
    startOfMonthTimestamp: number
  ): Promise<number> {
    const snaps = await this.db
      .collection("documents")
      .where("owner.type", "==", "user")
      .where("owner.userId", "==", userId)
      .where("createdAt", ">=", startOfMonthTimestamp)
      .count()
      .get();

    return snaps.data().count;
  }
}

export class FirestoreAccessRepository implements IAccessRepository {
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async createAccessLink(link: AccessLinkRecord): Promise<void> {
    await this.db.collection("access_links").doc(link.tokenHash).set(link);
  }

  public async getAccessLink(tokenHash: string): Promise<AccessLinkRecord | null> {
    const snap = await this.db.collection("access_links").doc(tokenHash).get();
    if (!snap.exists) return null;
    return snap.data() as AccessLinkRecord;
  }

  public async findActiveShareLink(
    documentId: string,
    userId: string
  ): Promise<AccessLinkRecord | null> {
    const snaps = await this.db
      .collection("access_links")
      .where("documentId", "==", documentId)
      .where("kind", "==", "share")
      .where("active", "==", true)
      .where("createdByUserId", "==", userId)
      .limit(1)
      .get();

    if (snaps.empty) return null;
    return snaps.docs[0].data() as AccessLinkRecord;
  }

  public async revokeAccessLink(tokenHash: string): Promise<void> {
    await this.db.collection("access_links").doc(tokenHash).update({
      active: false,
      revokedAt: Date.now(),
    });
  }

  public async revokeDocumentShareLinks(documentId: string): Promise<void> {
    const snaps = await this.db
      .collection("access_links")
      .where("documentId", "==", documentId)
      .where("kind", "==", "share")
      .where("active", "==", true)
      .get();

    if (snaps.empty) return;

    const batch = this.db.batch();
    const now = Date.now();
    for (const doc of snaps.docs) {
      batch.update(doc.ref, { active: false, revokedAt: now });
    }
    await batch.commit();
  }
}

export class FirestoreOrdersRepository implements IOrdersRepository {
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async createOrder(order: Omit<OrderRecord, "id">): Promise<OrderRecord> {
    const docRef = this.db.collection("orders").doc();
    const record: OrderRecord = {
      ...order,
      id: docRef.id,
    };
    await docRef.set(record);
    return record;
  }

  public async getOrder(orderId: string): Promise<OrderRecord | null> {
    const snap = await this.db.collection("orders").doc(orderId).get();
    if (!snap.exists) return null;
    return { ...snap.data(), id: snap.id } as OrderRecord;
  }

  public async markOrderPaid(orderId: string): Promise<OrderRecord> {
    const docRef = this.db.collection("orders").doc(orderId);
    const paidAt = Date.now();
    await docRef.update({
      status: "paid",
      paidAt,
    });
    const snap = await docRef.get();
    return { ...snap.data(), id: snap.id } as OrderRecord;
  }

  public async consumeOrder(orderId: string, documentId: string): Promise<void> {
    await this.db.collection("orders").doc(orderId).update({
      status: "consumed",
      documentId,
      consumedAt: Date.now(),
    });
  }
}

export class FirestoreGenerationRequestsRepository
  implements IGenerationRequestsRepository
{
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async getOrCreateRequest(
    requestId: string,
    initData: Omit<
      GenerationRequestRecord,
      "requestId" | "status" | "createdAt" | "updatedAt" | "expiresAt"
    >
  ): Promise<{ request: GenerationRequestRecord; isNew: boolean }> {
    const docRef = this.db.collection("generation_requests").doc(requestId);

    return await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (snap.exists) {
        return { request: snap.data() as GenerationRequestRecord, isNew: false };
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

      tx.set(docRef, newRecord);
      return { request: newRecord, isNew: true };
    });
  }

  public async getRequest(
    requestId: string
  ): Promise<GenerationRequestRecord | null> {
    const snap = await this.db.collection("generation_requests").doc(requestId).get();
    if (!snap.exists) return null;
    return snap.data() as GenerationRequestRecord;
  }

  public async markCompleted(
    requestId: string,
    result?: { guestAccessPath?: string }
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      status: "completed",
      updatedAt: Date.now(),
    };
    if (result) {
      updates.result = result;
    }
    await this.db.collection("generation_requests").doc(requestId).update(updates);
  }

  public async markFailed(requestId: string, errorCode: string): Promise<void> {
    await this.db.collection("generation_requests").doc(requestId).update({
      status: "failed",
      errorCode,
      updatedAt: Date.now(),
    });
  }
}

export class FirestoreUsersRepository implements IUsersRepository {
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async getUserProfile(
    userId: string
  ): Promise<{ plano?: string; email?: string; nome?: string } | null> {
    const snap = await this.db.collection("users").doc(userId).get();
    if (!snap.exists) return null;
    return snap.data() as { plano?: string; email?: string; nome?: string };
  }
}

export interface BackendRepositories {
  documents: IDocumentsRepository;
  access: IAccessRepository;
  orders: IOrdersRepository;
  generationRequests: IGenerationRequestsRepository;
  users: IUsersRepository;
}

let repositoriesSingleton: BackendRepositories | null = null;

export function getRepositories(): BackendRepositories {
  if (repositoriesSingleton) {
    return repositoriesSingleton;
  }

  if (process.env.NODE_ENV === "test" && !process.env.FIRESTORE_EMULATOR_HOST) {
    repositoriesSingleton = {
      documents: new InMemoryDocumentsRepository(),
      access: new InMemoryAccessRepository(),
      orders: new InMemoryOrdersRepository(),
      generationRequests: new InMemoryGenerationRequestsRepository(),
      users: new InMemoryUsersRepository(),
    };
  } else {
    repositoriesSingleton = {
      documents: new FirestoreDocumentsRepository(),
      access: new FirestoreAccessRepository(),
      orders: new FirestoreOrdersRepository(),
      generationRequests: new FirestoreGenerationRequestsRepository(),
      users: new FirestoreUsersRepository(),
    };
  }

  return repositoriesSingleton;
}

export function setTestRepositories(repos: BackendRepositories | null): void {
  repositoriesSingleton = repos;
}
