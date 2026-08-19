import { describe, expect, it } from "bun:test";
import { fillDocument } from "@/lib/document-engine";
import { getModelo } from "@/lib/modelos";

function renderModelo(slug: string, respostas: Record<string, string>): string {
  const modelo = getModelo(slug)!;
  return fillDocument({
    titulo: modelo.template.titulo,
    corpo: modelo.template.corpo,
    respostas,
    modelo,
  }).join("\n");
}

describe("coerência jurídica das locações", () => {
  it("usa o regime do art. 47 quando a locação residencial tem prazo inferior a 30 meses", () => {
    const texto = renderModelo("contrato-locacao", { prazo: "12" });

    expect(texto).toContain("art. 47 da Lei nº 8.245/1991");
    expect(texto).not.toContain("nos termos do art. 46 da Lei nº 8.245/1991");
    expect(texto).toContain("prorrogar-se-á automaticamente por prazo indeterminado");
  });

  it("mantém o regime do art. 46 quando a locação residencial tem prazo igual ou superior a 30 meses", () => {
    const texto = renderModelo("contrato-locacao", { prazo: "30" });

    expect(texto).toContain("art. 46 da Lei nº 8.245/1991");
    expect(texto).toContain("independentemente de notificação ou aviso");
  });

  it("não atribui despesas condominiais extraordinárias ao locatário comercial", () => {
    const texto = renderModelo("contrato-locacao-comercial", {});

    expect(texto).not.toContain("despesas condominiais ordinárias e extraordinárias");
    expect(texto).toContain("despesas condominiais extraordinárias");
    expect(texto).toContain("correrão por conta do LOCADOR");
  });

  it("distingue constituição e reposição do fundo de reserva na locação residencial", () => {
    const texto = renderModelo("contrato-locacao", { prazo: "30" });

    expect(texto).not.toContain("incluindo fundo de reserva quando exigido pela convenção condominial");
    expect(texto).toContain("constituição do fundo de reserva");
    expect(texto).toContain("reposição do fundo de reserva");
  });
});
