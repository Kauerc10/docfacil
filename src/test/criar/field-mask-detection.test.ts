import { describe, expect, test } from "bun:test";
import { detectarMascara } from "@/components/docfacil/views/criar/types";
import type { CampoModelo } from "@/lib/types";

function campo(key: string, pergunta = key): CampoModelo {
  return {
    key,
    pergunta,
    tipo: "text",
    obrigatorio: false,
  } as CampoModelo;
}

describe("detectarMascara", () => {
  test("não confunde o prefixo comodatario com campo de data", () => {
    expect(detectarMascara(campo("comodatario_nome"))).toBe("texto");
    expect(detectarMascara(campo("comodatario_rg"))).toBe("texto");
    expect(detectarMascara(campo("comodatario_rua"))).toBe("texto");
    expect(detectarMascara(campo("comodatario_numero"))).toBe("texto");
  });

  test("continua reconhecendo chaves realmente temporais", () => {
    expect(detectarMascara(campo("data_assinatura"))).toBe("data");
    expect(detectarMascara(campo("declarante_data_nascimento"))).toBe("data");
    expect(detectarMascara(campo("nascimento"))).toBe("data");
  });
});
