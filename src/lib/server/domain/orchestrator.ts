import "server-only";
import type { Principal } from "../security";
import type { ArtifactState } from "./documents";
import {
  reconstructAndValidateResponses,
  generateAccessToken,
  calculateSourceHash,
  calculateModelSnapshotHash,
} from "./documents";
import { BackendError } from "../errors";
import { MODELOS } from "../../modelos";
import { resolveEntitlement } from "../billing/entitlement";
import { createBuyerFingerprint } from "../billing/order-identity";
import { generatePdfServer } from "../../pdf/server/generator";
import type { BackendRepositories } from "../firestore/repositories";
import { getRepositories } from "../firestore/repositories";
import type { ArtifactStorage } from "../r2/storage";
import { getArtifactStorage } from "../r2/storage";
import { logger } from "../../logger";

export interface GenerateDocumentDependencies {
  repositories?: Partial<BackendRepositories>;
  storage?: ArtifactStorage;
}

export interface GenerateDocumentInput {
  requestId: string;
  principal: Principal;
  modeloSlug: string;
  respostas: Record<string, string>;
  clausulasSelecionadas?: string[];
  guestContact?: { email?: string; phone?: string };
  orderId?: string;
  existingDocumentId?: string;
  deps?: GenerateDocumentDependencies;
}

export interface GenerateDocumentResult {
  documentId: string;
  version: number;
  artifactState: ArtifactState;
  guestAccessToken?: string;
  guestAccessPath?: string;
}

export async function generateDocumentArtifact(
  input: GenerateDocumentInput
): Promise<GenerateDocumentResult> {
  const {
    requestId,
    principal,
    modeloSlug,
    respostas,
    clausulasSelecionadas = [],
    guestContact,
    orderId,
    existingDocumentId,
    deps,
  } = input;

  const defaultRepos = getRepositories();
  const docs = deps?.repositories?.documents || defaultRepos.documents;
  const access = deps?.repositories?.access || defaultRepos.access;
  const orders = deps?.repositories?.orders || defaultRepos.orders;
  const generationRequests = deps?.repositories?.generationRequests || defaultRepos.generationRequests;
  const users = deps?.repositories?.users || defaultRepos.users;

  let generationCommit = deps?.repositories?.generationCommit || defaultRepos.generationCommit;
  if (!deps?.repositories?.generationCommit && deps?.repositories) {
    const { InMemoryGenerationCommitRepository } = await import("../firestore/in-memory-repositories");
    generationCommit = new InMemoryGenerationCommitRepository(
      docs as any,
      access as any,
      orders as any,
      generationRequests as any
    );
  }

  const repos: BackendRepositories = {
    documents: docs,
    access,
    orders,
    generationRequests,
    users,
    generationCommit,
  };
  const storage = deps?.storage || getArtifactStorage();

  const principalKey =
    principal.type === "guest"
      ? `guest:${createBuyerFingerprint(guestContact || {})}`
      : `user:${principal.userId}`;

  let expectedTargetVersion = 1;
  if (existingDocumentId) {
    const existingDoc = await repos.documents.getDocument(existingDocumentId);
    if (existingDoc) {
      expectedTargetVersion = (existingDoc.currentVersion || 0) + 1;
    }
  }

  // 1. Idempotência / Trava de requisição
  const { request: genReq, isNew } = await repos.generationRequests.getOrCreateRequest(
    requestId,
    {
      operation: existingDocumentId ? "pro_regeneration" : "initial",
      principalKey,
      documentId: existingDocumentId || "pending",
      targetVersion: expectedTargetVersion,
    }
  );

  if (!isNew) {
    if (genReq.status === "completed") {
      const doc = await repos.documents.getDocument(genReq.documentId);
      if (doc) {
        return {
          documentId: doc.id!,
          version: genReq.targetVersion,
          artifactState: "ready",
          guestAccessPath: genReq.result?.guestAccessPath,
        };
      }
    }
    if (genReq.status === "processing") {
      throw new BackendError(
        "GENERATION_IN_PROGRESS",
        409,
        "A geração deste documento já está em andamento."
      );
    }
    if (genReq.status === "failed") {
      throw new BackendError(
        (genReq.errorCode as any) || "GENERATION_FAILED",
        500,
        "A tentativa anterior de geração falhou. Por favor, tente novamente com uma nova solicitação."
      );
    }
  }

  // 2. Localiza o modelo confiável no catálogo do servidor
  const modelo = MODELOS.find((m) => m.slug === modeloSlug);
  if (!modelo) {
    await repos.generationRequests.markFailed(requestId, "INVALID_REQUEST");
    throw new BackendError("INVALID_REQUEST", 400, `Modelo '${modeloSlug}' não encontrado.`);
  }

  // 3. Resolução de Entitlement e Trava de Documento
  let entitlementDecision: {
    entitlement: "free" | "single_purchase" | "pro";
    watermarked: boolean;
    orderId?: string;
  };
  let documentId: string;
  let targetVersion: number;

  if (existingDocumentId) {
    const existingDoc = await repos.documents.getDocument(existingDocumentId);
    if (!existingDoc) {
      await repos.generationRequests.markFailed(requestId, "DOCUMENT_NOT_FOUND");
      throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Documento não encontrado.");
    }

    if (
      existingDoc.owner.type !== "user" ||
      principal.type !== "user" ||
      existingDoc.owner.userId !== principal.userId
    ) {
      await repos.generationRequests.markFailed(requestId, "DOCUMENT_FORBIDDEN");
      throw new BackendError(
        "DOCUMENT_FORBIDDEN",
        403,
        "Você não tem permissão para alterar este documento."
      );
    }

    const profile = await repos.users.getUserProfile(principal.userId);
    if (profile?.plano !== "pro") {
      await repos.generationRequests.markFailed(requestId, "PRO_REQUIRED");
      throw new BackendError(
        "PRO_REQUIRED",
        402,
        "Apenas assinantes Pro podem editar e gerar novas versões deste documento."
      );
    }

    documentId = existingDocumentId;
    targetVersion = (existingDoc.currentVersion || 0) + 1;
    entitlementDecision = { entitlement: "pro", watermarked: false };
  } else {
    // Novo documento
    targetVersion = 1;

    if (principal.type === "guest") {
      if (!guestContact?.email && !guestContact?.phone) {
        await repos.generationRequests.markFailed(requestId, "INVALID_REQUEST");
        throw new BackendError(
          "INVALID_REQUEST",
          400,
          "Contato (e-mail ou telefone) é obrigatório para compra e finalização como visitante."
        );
      }
      if (!orderId) {
        await repos.generationRequests.markFailed(requestId, "PAYMENT_REQUIRED");
        throw new BackendError(
          "PAYMENT_REQUIRED",
          402,
          "Pagamento avulso necessário para guests."
        );
      }
      const order = await repos.orders.reservePaidOrder({
        orderId,
        requestId,
        principalKey,
      });
      entitlementDecision = resolveEntitlement({ principal, orderId, order });
    } else {
      const profile = await repos.users.getUserProfile(principal.userId);
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).getTime();
      const monthlyCount = await repos.documents.countUserMonthlyDocuments(
        principal.userId,
        startOfMonth
      );
      const order = orderId
        ? await repos.orders.reservePaidOrder({
            orderId,
            requestId,
            principalKey,
          })
        : undefined;
      entitlementDecision = resolveEntitlement({
        principal,
        orderId,
        order,
        userProfile: profile,
        currentMonthlyCount: monthlyCount,
      });
    }

    const owner =
      principal.type === "guest"
        ? {
            type: "guest" as const,
            contact: { email: guestContact?.email, phone: guestContact?.phone },
          }
        : { type: "user" as const, userId: principal.userId };

    const newDoc = await repos.documents.createDocument({
      owner,
      modeloSlug: modelo.slug,
      modeloNome: modelo.nome,
      respostas: {},
      entitlement: {
        type: entitlementDecision.entitlement,
        orderId: entitlementDecision.orderId,
        watermarked: entitlementDecision.watermarked,
      },
      artifactState: "generating",
      currentVersion: null,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    documentId = newDoc.id!;
  }

  // 4. Valida e reconstrói respostas canônicas
  let sanitizedAnswers: Record<string, string>;
  try {
    sanitizedAnswers = reconstructAndValidateResponses(
      modelo,
      respostas,
      clausulasSelecionadas
    );
  } catch (err: unknown) {
    if (entitlementDecision?.entitlement === "single_purchase" && entitlementDecision?.orderId) {
      await repos.orders.releaseReservedOrder({
        orderId: entitlementDecision.orderId,
        requestId,
      }).catch(() => {});
    }
    await repos.documents.setArtifactState(documentId, "failed", {
      code: "INVALID_REQUEST",
      at: Date.now(),
    });
    await repos.generationRequests.markFailed(requestId, "INVALID_REQUEST");
    throw err;
  }

  // 5. Geração de PDF e Persistência Atômica
  let uploadedObjectKey: string | null = null;
  let firestoreCommitSucceeded = false;
  try {
    const pdfBuffer = await generatePdfServer(modelo, sanitizedAnswers, {
      watermark: entitlementDecision.watermarked,
    });

    const filename = `${modelo.slug}.pdf`;
    const putResult = await storage.putArtifact({
      documentId,
      version: targetVersion,
      pdfBuffer,
      filename,
    });
    uploadedObjectKey = putResult.objectKey;

    const sourceHash = calculateSourceHash(sanitizedAnswers);
    const modelSnapshotHash = calculateModelSnapshotHash(modelo);

    let guestAccessToken: string | undefined;
    let guestAccessPath: string | undefined;
    let guestAccessTokenHash: string | undefined;

    if (principal.type === "guest") {
      const generated = generateAccessToken();
      guestAccessToken = generated.token;
      guestAccessTokenHash = generated.tokenHash;
      guestAccessPath = `/d/${generated.token}`;
    }

    const now = Date.now();

    await repos.generationCommit.commitGeneratedArtifact({
      requestId,
      documentId,
      targetVersion,
      respostas: sanitizedAnswers,
      artifact: {
        version: targetVersion,
        objectKey: putResult.objectKey,
        sha256: putResult.sha256,
        sizeBytes: putResult.sizeBytes,
        mimeType: "application/pdf",
        filename,
        watermarked: entitlementDecision.watermarked,
        sourceHash,
        modelSnapshotHash,
        generatedAt: now,
      },
      singlePurchase:
        entitlementDecision.entitlement === "single_purchase" &&
        entitlementDecision.orderId
          ? {
              orderId: entitlementDecision.orderId,
              requestId,
            }
          : undefined,
      guestAccess: guestAccessTokenHash
        ? { tokenHash: guestAccessTokenHash }
        : undefined,
      guestAccessPath,
      now,
    });

    firestoreCommitSucceeded = true;

    return {
      documentId,
      version: targetVersion,
      artifactState: "ready",
      guestAccessToken,
      guestAccessPath,
    };
  } catch (err: unknown) {
    if (uploadedObjectKey && !firestoreCommitSucceeded) {
      try {
        await storage.deleteArtifact(uploadedObjectKey);
      } catch (cleanupErr) {
        logger.error("orchestrator", "falha na compensacao r2 apos erro", cleanupErr);
      }
    }
    if (!firestoreCommitSucceeded && entitlementDecision?.entitlement === "single_purchase" && entitlementDecision?.orderId) {
      await repos.orders.releaseReservedOrder({
        orderId: entitlementDecision.orderId,
        requestId,
      }).catch(() => {});
    }
    const errCode = err instanceof BackendError ? err.code : "GENERATION_FAILED";
    await repos.documents.setArtifactState(documentId, "failed", {
      code: errCode,
      at: Date.now(),
    }).catch(() => {});
    await repos.generationRequests.markFailed(requestId, errCode).catch(() => {});
    throw err;
  }
}
