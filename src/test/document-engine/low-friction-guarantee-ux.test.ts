import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const clausulaCardSource = readFileSync(
  join(process.cwd(), "src/components/docfacil/views/criar/clausula-card.tsx"),
  "utf8"
);

describe("garantia locatícia com baixo atrito", () => {
  it("trata modalidades de garantia como escolha única na interface", () => {
    expect(clausulaCardSource).toContain("RENTAL_GUARANTEE_IDS");
    expect(clausulaCardSource).toContain("isRentalGuaranteeGroup");
    expect(clausulaCardSource).toContain('role={singleChoice ? "radio" : "checkbox"}');
  });

  it("troca a garantia selecionada sem exigir que o usuário desmarque a anterior", () => {
    expect(clausulaCardSource).toContain("selecionadas.filter");
    expect(clausulaCardSource).toContain("onToggle(id, false)");
  });
});
