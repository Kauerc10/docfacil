import { describe, expect, it } from "bun:test";
import { MODELOS } from "@/lib/modelos";
import { normalizarRespostasLegadasDeContrato } from "@/lib/document-engine/legacy-contract-answers";

const compraVendaImovel = MODELOS.find(
  (modelo) => modelo.slug === "contrato-compra-venda-imovel"
);

if (!compraVendaImovel) {
  throw new Error("Modelo contrato-compra-venda-imovel não encontrado.");
}

describe("respostas condicionais", () => {
  it("remove sinal e forma de pagamento quando a resposta controladora é Não", () => {
    const respostas = normalizarRespostasLegadasDeContrato(compraVendaImovel, {
      possui_sinal: "Não",
      sinal: "35.000,00",
      forma_pagamento_sinal: "PIX na assinatura",
    });

    expect(respostas.possui_sinal).toBe("Não");
    expect(respostas.sinal).toBeUndefined();
    expect(respostas.forma_pagamento_sinal).toBeUndefined();
  });

  it("preserva os campos quando a condição continua visível", () => {
    const respostas = normalizarRespostasLegadasDeContrato(compraVendaImovel, {
      possui_sinal: "Sim",
      sinal: "35.000,00",
      forma_pagamento_sinal: "PIX na assinatura",
    });

    expect(respostas.possui_sinal).toBe("Sim");
    expect(respostas.sinal).toBe("35.000,00");
    expect(respostas.forma_pagamento_sinal).toBe("PIX na assinatura");
  });
});
