import { describe, expect, it } from "bun:test";
import { getMoradorRowKey } from "@/components/docfacil/views/criar/lista-pessoas";

describe("formulário de moradores autorizados", () => {
  it("mantém a chave da linha estável enquanto o nome é digitado", () => {
    expect(getMoradorRowKey(0)).toBe("morador-0");
    expect(getMoradorRowKey(1)).toBe("morador-1");
  });
});
