import "server-only";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import type { Modelo } from "../../types";
import { BackendError } from "../errors";
import { aplicarComposicaoModelo } from "../../document-engine/compose";
import { computeCamposOpcionais } from "../../document-engine/optional-fields";

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
  product: "avulso";
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

export function reconstructAndValidateResponses(
  modelo: Modelo,
  rawRespostas: Record<string, string>,
  clausulasSelecionadas: string[] = []
): Record<string, string> {
  const composed = aplicarComposicaoModelo(rawRespostas, modelo);
  const optionalSet = new Set(computeCamposOpcionais(modelo, clausulasSelecionadas));

  const allowedKeys = new Set<string>();
  const requiredKeys = new Set<{ key: string; label: string }>();

  // Coleta campos principais do modelo
  for (const campo of modelo.campos || []) {
    allowedKeys.add(campo.key);
    if (!optionalSet.has(campo.key) && campo.obrigatorio !== false) {
      requiredKeys.add({ key: campo.key, label: campo.pergunta || campo.key });
    }
  }

  // Coleta campos virtuais / saídas de endereço configuradas nas etapas
  if (modelo.etapas) {
    for (const etapa of modelo.etapas) {
      if (etapa.tipo === "campo_grupo") {
        if (etapa.endereco?.saidaKey) {
          allowedKeys.add(etapa.endereco.saidaKey);
          if (!optionalSet.has(etapa.endereco.saidaKey)) {
            requiredKeys.add({
              key: etapa.endereco.saidaKey,
              label: etapa.tituloGrupo || etapa.endereco.saidaKey,
            });
          }
        }
        for (const c of etapa.campos) {
          allowedKeys.add(c.key);
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

  // Valida campos obrigatórios sobre as respostas compostas
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

  // Preenche valores sanitizados (apenas chaves permitidas)
  for (const [key, value] of Object.entries(composed)) {
    if (allowedKeys.has(key) && typeof value === "string") {
      sanitized[key] = value.trim();
    }
  }

  // Registra cláusulas selecionadas
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

export function calculateModelSnapshotHash(modelo: Modelo): string {
  const snapshot = {
    slug: modelo.slug,
    nome: modelo.nome,
    template: modelo.template,
    campos: (modelo.campos || []).map((c) => ({
      key: c.key,
      pergunta: c.pergunta,
      tipo: c.tipo,
    })),
  };
  return createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}
