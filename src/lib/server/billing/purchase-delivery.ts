import "server-only";
import crypto from "node:crypto";
import { BackendError } from "../errors";
import { MODELOS } from "../../modelos";
import { reconstructAndValidateResponses } from "../domain/documents";
import { generateDocumentArtifact, type GenerateDocumentDependencies, type GenerateDocumentResult } from "../domain/orchestrator";
import type { OrderRecord } from "../domain/documents";
import type { IGenerationRequestsRepository, IOrdersRepository } from "../firestore/interfaces";
import { getRepositories } from "../firestore/repositories";
import { FirestorePurchaseDeliveryStore, type PurchaseBuyer, type PurchaseDeliveryRecord, type PurchaseDeliveryResult, type PurchaseDeliveryStore, type PurchaseDraftSnapshot } from "./purchase-delivery-store";

const DELIVERY_LEASE_MS = 5 * 60_000;
const MAX_RETRIES = 3;

export interface PurchaseDraftInput {
  modeloSlug: string;
  respostas: Record<string, string>;
  clausulasSelecionadas?: string[];
  guestContact?: { email?: string; phone?: string };
}

export interface PurchaseDeliveryDependencies {
  orders: IOrdersRepository;
  generationRequests?: IGenerationRequestsRepository;
  store: PurchaseDeliveryStore;
  generate?: (input: Parameters<typeof generateDocumentArtifact>[0]) => Promise<GenerateDocumentResult>;
  generation?: GenerateDocumentDependencies;
  now?: () => number;
  ownerId?: () => string;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function hashSnapshot(value: unknown): string {
  return crypto.createHash("sha256").update(canonical(value)).digest("hex");
}

function normalizeBuyer(buyer: PurchaseBuyer): PurchaseBuyer {
  if (buyer.type === "user") return { type: "user", userId: buyer.userId };
  const email = buyer.email?.trim().toLowerCase();
  const phone = buyer.phone?.trim();
  if (!email && !phone) throw new BackendError("INVALID_REQUEST", 400, "Contato do comprador é obrigatório.");
  return { type: "guest", ...(email ? { email } : {}), ...(phone ? { phone } : {}) };
}

function buyersMatch(left: PurchaseBuyer, right: OrderRecord["buyer"]): boolean {
  if (left.type !== right.type) return false;
  if (left.type === "user" && right.type === "user") return left.userId === right.userId;
  if (left.type === "guest" && right.type === "guest") return (left.email?.trim().toLowerCase() || "") === (right.email?.trim().toLowerCase() || "") && (left.phone?.trim() || "") === (right.phone?.trim() || "");
  return false;
}

function defaults(deps?: Partial<PurchaseDeliveryDependencies>): PurchaseDeliveryDependencies {
  const repositories = deps?.orders && deps?.generationRequests ? undefined : getRepositories();
  return {
    orders: deps?.orders ?? repositories!.orders,
    generationRequests: deps?.generationRequests ?? repositories!.generationRequests,
    store: deps?.store ?? new FirestorePurchaseDeliveryStore(),
    generate: deps?.generate,
    generation: deps?.generation,
    now: deps?.now ?? (() => Date.now()),
    ownerId: deps?.ownerId ?? (() => crypto.randomUUID()),
  };
}

async function orderOrThrow(orders: IOrdersRepository, orderId: string): Promise<OrderRecord> {
  const order = await orders.getOrder(orderId);
  if (!order) throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido de compra não encontrado.");
  return order;
}

function validateSnapshot(input: PurchaseDraftInput, capturedAt: number): PurchaseDraftSnapshot {
  const modelo = MODELOS.find((item) => item.slug === input.modeloSlug);
  if (!modelo) throw new BackendError("INVALID_REQUEST", 400, "Modelo de documento inválido.");
  let respostas: Record<string, string>;
  try {
    respostas = reconstructAndValidateResponses(modelo, input.respostas, input.clausulasSelecionadas ?? []);
  } catch (error) {
    throw error instanceof BackendError ? error : new BackendError("INVALID_REQUEST", 400, "Rascunho inválido.");
  }
  const guestContact = input.guestContact ? {
    ...(input.guestContact.email ? { email: input.guestContact.email.trim().toLowerCase() } : {}),
    ...(input.guestContact.phone ? { phone: input.guestContact.phone.trim() } : {}),
  } : undefined;
  const base = { modeloSlug: modelo.slug, respostas, clausulasSelecionadas: [...(input.clausulasSelecionadas ?? [])].sort(), ...(guestContact ? { guestContact } : {}) };
  return { ...base, capturedAt, snapshotHash: hashSnapshot(base) };
}

export async function capturePurchase(orderId: string, buyer: PurchaseBuyer, draft: PurchaseDraftInput, inputDeps?: Partial<PurchaseDeliveryDependencies>): Promise<PurchaseDeliveryRecord> {
  const deps = defaults(inputDeps);
  const order = await orderOrThrow(deps.orders, orderId);
  const normalizedBuyer = normalizeBuyer(buyer);
  if (!buyersMatch(normalizedBuyer, order.buyer)) throw new BackendError("ORDER_FORBIDDEN", 403, "Você não tem permissão para este pedido.");
  if (order.product !== "avulso") throw new BackendError("INVALID_REQUEST", 400, "A entrega deste pedido não é avulsa.");
  if (normalizedBuyer.type === "guest" && !normalizedBuyer.email) throw new BackendError("INVALID_REQUEST", 400, "E-mail é obrigatório para compra visitante.");
  if (normalizedBuyer.type === "guest" && draft.guestContact?.email?.trim().toLowerCase() !== normalizedBuyer.email) throw new BackendError("INVALID_REQUEST", 400, "Contato do rascunho não corresponde ao comprador.");
  const snapshot = validateSnapshot(draft, deps.now!());
  return deps.store.capture({ orderId, buyer: normalizedBuyer, snapshot, jobKey: `purchase:${orderId}`, maxRetries: MAX_RETRIES, now: deps.now!() });
}

export async function deliverPaidPurchase(orderId: string, inputDeps?: Partial<PurchaseDeliveryDependencies>): Promise<PurchaseDeliveryRecord | null> {
  const deps = defaults(inputDeps);
  const order = await orderOrThrow(deps.orders, orderId);
  const existing = await deps.store.get(orderId);
  if (order.status === "refunded" || order.status === "failed") throw new BackendError("PAYMENT_REQUIRED", 402, "Esta compra não está disponível para entrega.");
  if (existing?.status === "completed") return existing;
  if (!existing) {
    if (order.status !== "paid") throw new BackendError("PAYMENT_REQUIRED", 402, "Pagamento ainda não foi confirmado.");
    throw new BackendError("INVALID_REQUEST", 409, "O rascunho pago não foi capturado antes do checkout.");
  }
  let requestIdToReuse: string | undefined;
  if (existing.status === "processing" && existing.generationRequestId && deps.generationRequests) {
    const generationRequest = await deps.generationRequests.getRequest(existing.generationRequestId);
    if (generationRequest?.status === "completed" && generationRequest.documentId) {
      if (order.status === "consumed" && order.documentId && generationRequest.documentId !== order.documentId) return existing;
      await deps.store.complete({ orderId, owner: existing.leaseOwner ?? "recovery", now: deps.now!(), result: { documentId: generationRequest.documentId, version: generationRequest.targetVersion, ...(generationRequest.result?.guestAccessPath ? { guestAccessPath: generationRequest.result.guestAccessPath } : {}) } });
      return deps.store.get(orderId);
    }
    if (generationRequest?.status !== "failed") requestIdToReuse = existing.generationRequestId;
    if (generationRequest?.status === "failed" && existing.leaseExpiresAt && existing.leaseExpiresAt > deps.now!()) return existing;
  }
  if (order.status !== "paid") {
    if (order.status === "consumed") return existing;
    throw new BackendError("PAYMENT_REQUIRED", 402, "Pagamento ainda não foi confirmado.");
  }
  const owner = deps.ownerId!();
  const claim = await deps.store.claim({ orderId, owner, now: deps.now!(), leaseMs: DELIVERY_LEASE_MS, generationRequestId: requestIdToReuse });
  if (!claim.claimed) return claim.record;
  const requestId = claim.record!.generationRequestId ?? `${existing.jobKey}:${claim.record!.retryCount}`;
  try {
    const generate = deps.generate ?? generateDocumentArtifact;
    const principal = claim.record!.buyer.type === "user" ? { type: "user" as const, userId: claim.record!.buyer.userId, email: claim.record!.buyer.email } : { type: "guest" as const };
    const result = await generate({ requestId, principal, modeloSlug: claim.record!.snapshot.modeloSlug, respostas: claim.record!.snapshot.respostas, clausulasSelecionadas: claim.record!.snapshot.clausulasSelecionadas, guestContact: claim.record!.snapshot.guestContact, orderId, deps: { ...deps.generation, purchaseDeliveryOrderId: orderId } });
    const deliveryResult: PurchaseDeliveryResult = { documentId: result.documentId, version: result.version, ...(result.guestAccessPath ? { guestAccessPath: result.guestAccessPath } : {}) };
    await deps.store.complete({ orderId, owner, now: deps.now!(), result: deliveryResult });
    return deps.store.get(orderId);
  } catch (error) {
    const errorCode = error instanceof BackendError ? error.code : "GENERATION_FAILED";
    await deps.store.fail({ orderId, owner, now: deps.now!(), errorCode });
    throw error;
  }
}

export async function getPurchaseDelivery(orderId: string, inputDeps?: Partial<PurchaseDeliveryDependencies>): Promise<PurchaseDeliveryRecord | null> {
  const deps = defaults(inputDeps);
  const order = await orderOrThrow(deps.orders, orderId);
  if (order.status === "refunded" || order.status === "failed") return null;
  return deps.store.get(orderId);
}
