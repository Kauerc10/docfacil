import { describe, expect, it } from "bun:test";
import {
  clearFinalizationRequestId,
  clearFinalizationRequestIdByRequestId,
  getOrCreateFinalizationRequestId,
  shouldPreserveFinalizationRequestId,
} from "@/lib/documents/idempotency";

const CLIENT_PATH = new URL("../../lib/documents/client.ts", import.meta.url);

describe("version finalization idempotency policy", () => {
  it("preserva a mesma tentativa somente enquanto a geração realmente está em andamento", () => {
    expect(shouldPreserveFinalizationRequestId("GENERATION_IN_PROGRESS")).toBe(true);
    expect(shouldPreserveFinalizationRequestId("PRO_REQUIRED")).toBe(false);
    expect(shouldPreserveFinalizationRequestId("FREE_LIMIT_REACHED")).toBe(false);
    expect(shouldPreserveFinalizationRequestId("ORDER_NOT_PAID")).toBe(false);
    expect(shouldPreserveFinalizationRequestId(undefined)).toBe(false);
  });

  it("descarta uma intenção terminal pelo próprio requestId", () => {
    const slug = "declaracao-residencia-terceiro";
    clearFinalizationRequestId(slug);

    const failedRequestId = getOrCreateFinalizationRequestId(slug);
    clearFinalizationRequestIdByRequestId(failedRequestId);
    const freshRequestId = getOrCreateFinalizationRequestId(slug);

    expect(freshRequestId).not.toBe(failedRequestId);
    clearFinalizationRequestId(slug);
  });

  it("aplica a rotação também ao client de nova versão", async () => {
    const source = await Bun.file(CLIENT_PATH).text();

    expect(source).toContain("shouldPreserveFinalizationRequestId(code)");
    expect(source).toContain("clearFinalizationRequestIdByRequestId(requestId)");
  });
});
