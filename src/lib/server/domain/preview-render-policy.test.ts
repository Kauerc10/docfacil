import { describe, expect, it } from "bun:test";
import { resolveDocumentWatermark } from "./preview-render-policy";

describe("resolveDocumentWatermark", () => {
  it("applies the visual watermark only to the free entitlement", () => {
    expect(resolveDocumentWatermark("free")).toBe(true);
    expect(resolveDocumentWatermark("single_purchase")).toBe(false);
    expect(resolveDocumentWatermark("pro")).toBe(false);
  });
});
