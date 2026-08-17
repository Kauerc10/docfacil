import { describe, expect, it } from "bun:test";
import {
  getGuestDraftKey,
  saveGuestDraft,
  loadGuestDraft,
  clearGuestDraft,
} from "./client";

describe("documents client draft management", () => {
  it("formats draft key with namespace and version", () => {
    const key = getGuestDraftKey("contrato-locacao");
    expect(key).toBe("docfacil:draft:v1:contrato-locacao");
  });

  it("handles guest draft lifecycle", () => {
    saveGuestDraft("test-model", {
      requestId: "req_test_123",
      modeloSlug: "test-model",
      answers: { name: "John" },
      stepIndex: 1,
      clausulasSelecionadas: ["c1"],
      extrasPorClausula: {},
    });

    const loaded = loadGuestDraft("test-model");
    expect(loaded?.requestId).toBe("req_test_123");
    expect(loaded?.modeloSlug).toBe("test-model");
    expect(loaded?.answers.name).toBe("John");
    expect(loaded?.stepIndex).toBe(1);
    expect(loaded?.updatedAt).toBeDefined();

    clearGuestDraft("test-model");
    expect(loadGuestDraft("test-model")).toBeNull();
  });
});
