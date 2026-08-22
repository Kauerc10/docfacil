import "server-only";
import type { Principal } from "../security";
import type { ArtifactState, DocumentRecord } from "./documents";
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
import { FREE_MONTHLY_LIMIT } from "../../document-access-policy";
import { resolveDocumentWatermark } from "./preview-render-policy";

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

export const BILLING_TIME_ZONE = "America/Sao_Paulo";

const billingDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BILLING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getBillingZoneParts(date: Date) {
  const parts = billingDateTimeFormatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

function getBillingZoneOffsetMs(timestamp: number): number {
  const parts = getBillingZoneParts(new Date(timestamp));
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return representedAsUtc - Math.trunc(timestamp / 1000) * 1000;
}

/**
 * Retorna o instante UTC correspondente à meia-noite do primeiro dia do mês
 * civil vigente em São Paulo. A conversão usa o fuso IANA, sem hardcode de
 * UTC-3, para continuar correta se as regras de horário civil mudarem.
 */
export function getStartOfBillingMonthTimestamp(now = new Date()): number {
  const { year, month } = getBillingZoneParts(now);
  const localMidnightAsUtc = Date.UTC(year, month - 1, 1, 0, 0, 0);

  let candidate = localMidnightAsUtc;
  for (let attempt = 0; attempt < 3; attempt++) {
    const nextCandidate =
      localMidnightAsUtc - getBillingZoneOffsetMs(candidate);
    if (nextCandidate === candidate) break;
    candidate = nextCandidate;
  }

  return candidate;
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
  const generationRequests =
    deps?.repositories?.generationRequests || defaultRepos.generationRequests;
  const users = deps?.repositories?.users || defaultRepos.users;

  let generationCommit =
    deps?.repositories?.generationCommit || defaultRepos.generationCommit;
  if (!deps?.repositories?.generationCommit && deps?.repositories) {
    const { InMemoryGenerationCommitRepository } = await import(
      "../firestore/in-memory-repositories"
    );
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

  let existingDocument: DocumentRecord | null = null;
  if (existingDocumentId) {
    existingDocument = await repos.documents.getDocument(existingDocumentId);
  }

  const expectedTargetVersion = existingDocument
    ? (existingDocument.currentVersion || 0) + 1
    : 1;

  const { request: genReq, isNew } =
    await repos.generationRequests.getOrCreateRequest(requestId, {
      operation: existingDocumentId ? "pro_regeneration" : "initial",
      principalKey,
      documentId: existingDocumentId || "pending",
      targetVersion: expectedTargetVersion,
    });

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

  const modelo = MODELOS.find((item) => item.slug === modeloSlug);
  if (!modelo) {
    await repos.generationRequests.markFailed(requestId, "INVALID_REQUEST");
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      `Modelo '${modeloSlug}' não encontrado.`
    );
  }

  if (existingDocumentId) {
    if (!existingDocument) {
      await repos.generationRequests.markFailed(requestId, "DOCUMENT_NOT_FOUND");
      throw new BackendError(
        "DOCUMENT_NOT_FOUND",
        404,
        "Documento não encontrado."
      );
    }

    if (
      existingDocument.owner.type !== "user" ||
      principal.type !== "user" ||
      existingDocument.owner.userId !== principal.userId
    ) {
      await repos.generationRequests.markFailed(requestId, "DOCUMENT_FORBIDDEN");
      throw new BackendError(
        "DOCUMENT_FORBIDDEN",
        403,
        "Você não tem permissão para alterar este documento."
      );
    }

    if (existingDocument.modeloSlug !== modelo.slug) {
      await repos.generationRequests.markFailed(requestId, "INVALID_REQUEST");
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "O modelo informado é incompatível com o documento salvo."
      );
    }
  }

  let sanitizedAnswers: Record<string, string>;
  try {
    sanitizedAnswers = reconstructAndValidateResponses(
      modelo,
      respostas,
      clausulasSelecionadas
    );
  } catch (err: unknown) {
    await repos.generationRequests
      .markFailed(requestId, "INVALID_REQUEST")
      .catch(() => {});
    throw err;
  }

  let entitlementDecision: {
    entitlement: "free" | "single_purchase" | "pro";
    watermarked: boolean;
    orderId?: string;
  };
  let freeQuota:
    | {
        userId: string;
        startOfMonthTimestamp: number;
        initialCount: number;
        limit: number;
      }
    | undefined;
  let documentId: string;
  let targetVersion: number;

  if (existingDocumentId && existingDocument) {
    const userPrincipal = principal as Extract<Principal, { type: "user" }>;
    const profile = await repos.users.getUserProfile(userPrincipal.userId);

    if (profile?.plano === "pro") {
      entitlementDecision = {
        entitlement: "pro",
        watermarked: resolveDocumentWatermark("pro"),
      };
    } else if (orderId) {
      try {
        const order = await repos.orders.reservePaidOrder({
          orderId,
          requestId,
          principalKey,
        });
        entitlementDecision = resolveEntitlement({
          principal,
          modeloSlug,
          orderId,
          order,
          userProfile: profile,
        });
        entitlementDecision.watermarked = resolveDocumentWatermark(
          entitlementDecision.entitlement
        );
      } catch (err: unknown) {
        await repos.orders.releaseReservedOrder({ orderId, requestId }).catch(() => {});
        const errorCode =
          err instanceof BackendError ? err.code : "GENERATION_FAILED";
        await repos.generationRequests
          .markFailed(requestId, errorCode)
          .catch(() => {});
        throw err;
      }
    } else {
      await repos.generationRequests.markFailed(requestId, "PRO_REQUIRED");
      throw new BackendError(
        "PRO_REQUIRED",
        402,
        "Ative o Pro ou compre esta nova versão como documento avulso."
      );
    }

    documentId = existingDocumentId;
    try {
      targetVersion = await repos.documents.reserveNextVersion(
        documentId,
        requestId
      );
    } catch (err: unknown) {
      if (
        entitlementDecision.entitlement === "single_purchase" &&
        entitlementDecision.orderId
      ) {
        await repos.orders
          .releaseReservedOrder({
            orderId: entitlementDecision.orderId,
            requestId,
          })
          .catch(() => {});
      }
      const errorCode =
        err instanceof BackendError ? err.code : "GENERATION_FAILED";
      await repos.generationRequests
        .markFailed(requestId, errorCode)
        .catch(() => {});
      throw err;
    }
  } else {
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

      try {
        const order = await repos.orders.reservePaidOrder({
          orderId,
          requestId,
          principalKey,
        });
        entitlementDecision = resolveEntitlement({
          principal,
          modeloSlug,
          orderId,
          order,
        });
        entitlementDecision.watermarked = resolveDocumentWatermark(
          entitlementDecision.entitlement
        );
      } catch (err: unknown) {
        await repos.orders.releaseReservedOrder({ orderId, requestId }).catch(() => {});
        const errorCode =
          err instanceof BackendError ? err.code : "GENERATION_FAILED";
        await repos.generationRequests
          .markFailed(requestId, errorCode)
          .catch(() => {});
        throw err;
      }
    } else {
      const profile = await repos.users.getUserProfile(principal.userId);
      const startOfMonth = getStartOfBillingMonthTimestamp();
      const userDocuments = await repos.documents.listUserDocuments(
        principal.userId
      );
      const monthlyCount = userDocuments.filter(
        (document) =>
          document.entitlement.type === "free" &&
          document.createdAt >= startOfMonth &&
          document.status !== "deleted"
      ).length;

      let order:
        | Awaited<ReturnType<typeof repos.orders.reservePaidOrder>>
        | undefined;
      try {
        order = orderId
          ? await repos.orders.reservePaidOrder({
              orderId,
              requestId,
              principalKey,
            })
          : undefined;
        entitlementDecision = resolveEntitlement({
          principal,
          modeloSlug,
          orderId,
          order,
          userProfile: profile,
          currentMonthlyCount: monthlyCount,
        });
        entitlementDecision.watermarked = resolveDocumentWatermark(
          entitlementDecision.entitlement
        );
      } catch (err: unknown) {
        if (orderId) {
          await repos.orders
            .releaseReservedOrder({ orderId, requestId })
            .catch(() => {});
        }
        const errorCode =
          err instanceof BackendError ? err.code : "GENERATION_FAILED";
        await repos.generationRequests
          .markFailed(requestId, errorCode)
          .catch(() => {});
        throw err;
      }

      if (entitlementDecision.entitlement === "free") {
        freeQuota = {
          userId: principal.userId,
          startOfMonthTimestamp: startOfMonth,
          initialCount: monthlyCount,
          limit: FREE_MONTHLY_LIMIT,
        };
      }
    }

    const owner =
      principal.type === "guest"
        ? {
            type: "guest" as const,
            contact: {
              email: guestContact?.email,
              phone: guestContact?.phone,
            },
          }
        : { type: "user" as const, userId: principal.userId };

    try {
      const newDoc = await repos.documents.createDocument({
        owner,
        modeloSlug: modelo.slug,
        modeloNome: modelo.nome,
        respostas: sanitizedAnswers,
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
    } catch (err: unknown) {
      if (
        entitlementDecision.entitlement === "single_purchase" &&
        entitlementDecision.orderId
      ) {
        await repos.orders
          .releaseReservedOrder({
            orderId: entitlementDecision.orderId,
            requestId,
          })
          .catch(() => {});
      }
      const errorCode =
        err instanceof BackendError ? err.code : "GENERATION_FAILED";
      await repos.generationRequests
        .markFailed(requestId, errorCode)
        .catch(() => {});
      throw err;
    }
  }

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
      freeQuota,
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
        logger.error(
          "orchestrator",
          "falha na compensacao r2 apos erro",
          cleanupErr
        );
      }
    }

    if (
      !firestoreCommitSucceeded &&
      entitlementDecision.entitlement === "single_purchase" &&
      entitlementDecision.orderId
    ) {
      await repos.orders
        .releaseReservedOrder({
          orderId: entitlementDecision.orderId,
          requestId,
        })
        .catch(() => {});
    }

    const errCode =
      err instanceof BackendError ? err.code : "GENERATION_FAILED";
    await repos.documents
      .setArtifactState(documentId, existingDocumentId ? "ready" : "failed", {
        code: errCode,
        at: Date.now(),
      })
      .catch(() => {});
    await repos.generationRequests
      .markFailed(requestId, errCode)
      .catch(() => {});
    throw err;
  }
}
