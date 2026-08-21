import "server-only";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import type { Modelo } from "../../types";
import { BackendError } from "../errors";
import { aplicarComposicaoModelo } from "../../document-engine/compose";
import { normalizeCivilStatus } from "../../document-engine/civil-status";
import { computeCamposOpcionais } from "../../document-engine/optional-fields";
import { hasInvalidMoradoresAutorizados } from "../../document-engine/authorized-residents";
import { DOCUMENT_RENDER_RULES_VERSION } from "../../document-engine/legal-rules";

export type DocumentOwner =
  | { type: "guest"; contact: { email?: string; phone?: string } }
  | { type: "user"; userId: string };

export type DocumentEntitlement = "free" | "single_purchase" | "pro";
export type ArtifactState = "generating" | "ready" | "failed";

export interface DocumentRecord {
  id?: string;
  owner: DocumentOwner;
  modeloSlug: string;
  modeloNome: string;
  respostas: Record<string, string>;
  entitlement: {
    type: DocumentEntitlement;
    orderId?: string;
    watermarked: boolean;
  };
  artifactState: ArtifactState;
  generationRequestId?: string;
  currentVersion: number | null;
  targetVersion: number | null;
  lastGenerationError?: { code: string; at: number };
  status?: "active" | "deleted";
  deletedAt?: number;
  pendingPurge?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentArtifactRecord {
  version: number;
  objectKey: string;
  sha256: string;
  sizeBytes: number;
  mimeType: "application/pdf";
  filename: string;
  watermarked: boolean;
  sourceHash: string;
  modelSnapshotHash: string;
  generatedAt: number;
}

export interface AccessLinkRecord {
  tokenHash: string;
  kind: "guest" | "share";
  documentId: string;
  version: number;
  active: boolean;
  createdByUserId?: string;
  createdAt: number;
  expiresAt?: number;
  accessCount?: number;
  lastAccessedAt?: number;
  revokedAt?: number;
}

export interface GenerationRequestRecord {
  requestId: string;
  operation: "initial" | "pro_regeneration";
  principalKey: string;
  status: "processing" | "completed" | "failed";
  documentId: string;
  targetVersion: number;
  result?: { guestAccessPath?: string };
  errorCode?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "reserved"
  | "consumed"
  | "failed"
  | "refunded";

export interface OrderRecord {
  id?: string;
  provider: "demo";
  product: "avulso" | "pro";
  amountCents: number;
  buyer:
    | { type: "guest"; email?: string; phone?: string }
    | { type: "user"; userId: string; email?: string };
  status: OrderStatus;
  documentId?: string;
  reservedByRequestId?: string;
  reservedAt?: number;
  createdAt: number;
  paidAt?: number;
  consumedAt?: number;
}

export const documentDraftInputSchema = z.object({
  requestId: z.string().uuid("O requestId deve ser um UUID válido."),
  modeloSlug: z.string().min(1).max(100),
  respostas: z
    .record(
      z
        .string()
        .min(1)
        .max(100)
        .refine((k) => !k.startsWith("__clausula_") && !k.startsWith("__"), {
          message: "Chaves internas não são permitidas nas respostas.",
        }),
      z.string().max(10000)
    )
    .refine((obj) => Object.keys(obj).length <= 200, {
      message: "Limite de 200 campos excedido.",
    }),
  clausulasSelecionadas: z
    .array(z.string().min(1).max(100))
    .max(50)
    .optional()
    .default([]),
  guestContact: z
    .object({
      email: z.string().email("E-mail inválido.").optional(),
      phone: z.string().min(8, "Telefone inválido.").max(30).optional(),
    })
    .optional(),
  orderId: z.string().optional(),
});

export type DocumentDraftInput = z.infer<typeof documentDraftInputSchema>;

const RENTAL_MODEL_SLUGS = new Set([
  "contrato-locacao",
  "contrato-locacao-comercial",
]);

const RENTAL_GUARANTEE_IDS = new Set([
  "caucao",
  "fiador",
  "seguro_fianca",
  "cessao_fiduciaria",
]);

/**
 * Regras de coerência que não cabem em validação de campo isolado.
 *
 * O client pode usar uma UX mais simples, mas o servidor continua sendo a
 * autoridade final antes de persistir/gerar o documento. Essas regras ficam
 * deliberadamente pequenas e explícitas para a V1, sem criar um AST jurídico.
 */
export function validateDocumentSemanticInvariants(
  modelo: Modelo,
  rawRespostas: Record<string, string>,
  clausulasSelecionadas: string[] = []
): void {
  if (!RENTAL_MODEL_SLUGS.has(modelo.slug)) return;

  if (
    modelo.slug === "contrato-locacao" &&
    hasInvalidMoradoresAutorizados(rawRespostas.moradores_autorizados)
  ) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Informe o nome completo de cada morador adicional."
    );
  }

  const garantiasSelecionadas = clausulasSelecionadas.filter((id) =>
    RENTAL_GUARANTEE_IDS.has(id)
  );

  if (garantiasSelecionadas.length > 1) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Escolha apenas uma modalidade de garantia locatícia."
    );
  }

  if (garantiasSelecionadas.includes("caucao")) {
    const mesesRaw = (rawRespostas.caucao_meses ?? "").replace(/\D/g, "");
    if (mesesRaw) {
      const meses = Number(mesesRaw);
      if (Number.isFinite(meses) && meses > 3) {
        throw new BackendError(
          "INVALID_REQUEST",
          400,
          "A caução em dinheiro não pode ultrapassar três meses de aluguel."
        );
      }
    }
  }
}

export function reconstructAndValidateResponses(
  modelo: Modelo,
  rawRespostas: Record<string, string>,
  clausulasSelecionadas: string[] = []
): Record<string, string> {
  const normalizedRawRespostas = Object.fromEntries(
    Object.entries(rawRespostas).map(([key, value]) => {
      if (key !== "estado_civil" && !key.endsWith("_estado_civil")) {
        return [key, value];
      }

      if (value.trim() === "") return [key, value];

      const normalized = normalizeCivilStatus(value);
      if (normalized === null) {
        throw new BackendError(
          "INVALID_REQUEST",
          400,
          "Estado civil inválido."
        );
      }

      return [key, normalized];
    })
  );

  validateDocumentSemanticInvariants(
    modelo,
    normalizedRawRespostas,
    clausulasSelecionadas
  );

  const composed = aplicarComposicaoModelo(normalizedRawRespostas, modelo);
  const optionalSet = new Set(computeCamposOpcionais(modelo, clausulasSelecionadas));

  const allowedKeys = new Set<string>();
  const requiredKeys = new Set<{ key: string; label: string }>();

  for (const campo of modelo.campos || []) {
    allowedKeys.add(campo.key);
    if (!optionalSet.has(campo.key) && campo.obrigatorio !== false) {
      requiredKeys.add({ key: campo.key, label: campo.pergunta || campo.key });
    }
  }

  if (modelo.etapas) {
    for (const etapa of modelo.etapas) {
      if (etapa.tipo === "campo") {
        allowedKeys.add(etapa.campo.key);
        if (!optionalSet.has(etapa.campo.key) && etapa.campo.obrigatorio !== false) {
          requiredKeys.add({ key: etapa.campo.key, label: etapa.campo.pergunta || etapa.campo.key });
        }
      } else if (etapa.tipo === "campo_grupo") {
        if (etapa.endereco?.saidaKey) {
          allowedKeys.add(etapa.endereco.saidaKey);
        }
        for (const c of etapa.campos) {
          allowedKeys.add(c.key);
          if (!optionalSet.has(c.key) && c.obrigatorio !== false) {
            requiredKeys.add({ key: c.key, label: c.pergunta || c.key });
          }
          if (c.key === "rg" || c.key.endsWith("_rg")) {
            const prefix = c.key === "rg" ? "" : c.key.slice(0, -3);
            const sepKey = prefix ? `${prefix}_rg_separador` : "rg_separador";
            allowedKeys.add(sepKey);
          }
        }
      } else if (etapa.tipo === "clausulas") {
        for (const clausula of etapa.clausulas) {
          if (clausulasSelecionadas.includes(clausula.id)) {
            allowedKeys.add(`__clausula_${clausula.id}`);
            if (clausula.camposExtras) {
              for (const c of clausula.camposExtras) {
                allowedKeys.add(c.key);
                if (!optionalSet.has(c.key) && c.obrigatorio !== false) {
                  requiredKeys.add({ key: c.key, label: c.pergunta || c.key });
                }
              }
            }
          }
        }
      }
    }
  }

  allowedKeys.add("cidade_data");

  for (const req of requiredKeys) {
    const val = composed[req.key];
    if (val === undefined || val === null || val.trim() === "") {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        `Campo obrigatório ausente: ${req.label}`
      );
    }
  }

  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(composed)) {
    if (allowedKeys.has(key) && typeof value === "string") {
      sanitized[key] = value.trim();
    }
  }

  for (const id of clausulasSelecionadas) {
    sanitized[`__clausula_${id}`] = "true";
  }

  return sanitized;
}

export function generateAccessToken(): { token: string; tokenHash: string } {
  const bytes = randomBytes(32);
  const token = bytes.toString("base64url");
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function calculateSourceHash(respostas: Record<string, string>): string {
  const sortedKeys = Object.keys(respostas).sort();
  const canonical: Record<string, string> = {};
  for (const k of sortedKeys) {
    canonical[k] = respostas[k];
  }
  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

export function canonicalizeJson(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(
    entries.map(([k, v]) => [k, canonicalizeJson(v)])
  );
}

export function calculateModelSnapshotHash(modelo: Modelo): string {
  const snapshot = {
    slug: modelo.slug,
    nome: modelo.nome,
    template: modelo.template,
    etapas: modelo.etapas ?? [],
    campos: (modelo.campos || []).map((c) => ({
      key: c.key,
      pergunta: c.pergunta,
      tipo: c.tipo,
      obrigatorio: c.obrigatorio,
      listaPessoas: c.listaPessoas,
    })),
    renderRulesVersion: DOCUMENT_RENDER_RULES_VERSION,
  };
  const canonical = canonicalizeJson(snapshot);
  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

export interface ReconstructedDuplicateDraft {
  respostas: Record<string, string>;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
}

export function reconstructDuplicateDraft(
  modelo: Modelo,
  storedRespostas: Record<string, string>
): ReconstructedDuplicateDraft {
  const respostas: Record<string, string> = {};
  const clausulasSelecionadas: string[] = [];
  const extrasPorClausula: Record<string, Record<string, string>> = {};

  for (const [key, value] of Object.entries(storedRespostas || {})) {
    if (!key.startsWith("__")) {
      respostas[key] = value;
    }
  }

  for (const etapa of modelo.etapas || []) {
    if (etapa.tipo !== "clausulas") continue;

    for (const clausula of etapa.clausulas) {
      const marker = `__clausula_${clausula.id}`;

      if (storedRespostas[marker] === "true") {
        clausulasSelecionadas.push(clausula.id);

        const extras: Record<string, string> = {};

        for (const campo of clausula.camposExtras || []) {
          const value = storedRespostas[campo.key];

          if (typeof value === "string") {
            extras[campo.key] = value;
            delete respostas[campo.key];
          }
        }

        if (Object.keys(extras).length > 0) {
          extrasPorClausula[clausula.id] = extras;
        }
      }
    }
  }

  return {
    respostas,
    clausulasSelecionadas,
    extrasPorClausula,
  };
}
