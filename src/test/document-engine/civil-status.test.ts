import { describe, expect, test } from "bun:test";
import { normalizeCivilStatus } from "@/lib/document-engine/civil-status";

describe("normalizeCivilStatus", () => {
  test.each([
    ["di", "divorciado(a)"],
    ["DIV", "divorciado(a)"],
    ["divorciada", "divorciado(a)"],
    ["casado(a)", "casado(a)"],
    ["  VIÚVO(A)  ", "viúvo(a)"],
    ["em união estável", "em união estável"],
    ["separado", "separado(a) judicialmente"],
  ])("normaliza %s", (input, expected) => {
    expect(normalizeCivilStatus(input)).toBe(expected);
  });

  test("recusa valor desconhecido", () => {
    expect(normalizeCivilStatus("casadinho")).toBeNull();
  });
});
