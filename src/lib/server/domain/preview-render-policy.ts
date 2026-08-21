import "server-only";
import type { DocumentEntitlement } from "./documents";

/**
 * Visual-only policy shared by ephemeral previews and persisted generation.
 * Entitlement acquisition remains the responsibility of the billing domain.
 */
export function resolveDocumentWatermark(entitlement: DocumentEntitlement): boolean {
  return entitlement === "free";
}
