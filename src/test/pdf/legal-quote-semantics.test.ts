import { describe, expect, it } from "bun:test";
import { getModelo } from "@/lib/modelos";
import { isLegalQuote } from "@/lib/pdf/content-builder";
import { buildDocDefinition } from "@/lib/pdf/styles";

type PdfNode = {
  text?: unknown;
  style?: string;
  alignment?: string;
  italics?: boolean;
  [key: string]: unknown;
};

function plainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(plainText).join("");
  if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    if ("text" in node) return plainText(node.text);
  }
  return "";
}

function findNode(value: unknown, fragment: string): PdfNode | undefined {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findNode(child, fragment);
      if (found) return found;
    }
    return undefined;
  }
  if (!value || typeof value !== "object") return undefined;

  const node = value as PdfNode;
  if (plainText(node).includes(fragment) && typeof node.style === "string") {
    return node;
  }
  for (const child of Object.values(node)) {
    const found = findNode(child, fragment);
    if (found) return found;
  }
  return undefined;
}

describe("semântica de citações legais no PDF", () => {
  it("reconhece somente transcrição legal explícita como citação", () => {
    expect(isLegalQuote("Art. 299 - Omitir, em documento público ou particular...")).toBe(true);
    expect(isLegalQuote("Pena - reclusão, de um a cinco anos, e multa.")).toBe(true);
    expect(
      isLegalQuote(
        "Os conviventes assumem deveres recíprocos, conforme o art. 1.724 do Código Civil."
      )
    ).toBe(false);
  });

  it("mantém referência ao Código Civil da união estável como corpo normal", () => {
    const modelo = getModelo("uniao-estavel");
    if (!modelo) throw new Error("Modelo de união estável não encontrado");

    const ddo = buildDocDefinition(modelo, {}) as { content: PdfNode[] };
    const node = findNode(ddo.content, "art. 1.724 do Código Civil");

    expect(node).toBeDefined();
    expect(node?.style).toBe("body");
    expect(node?.italics).not.toBe(true);
  });
});
