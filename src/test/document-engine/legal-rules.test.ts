import { describe, expect, it } from "bun:test";
import { applyLegalTemplateRule } from "@/lib/document-engine/legal-rules";
import { getModelo } from "@/lib/modelos";

const MAINTENANCE_LINE =
  "Incumbem ao LOCATÁRIO os reparos decorrentes do uso normal do IMÓVEL e de pequenos consertos de manutenção, enquanto os reparos estruturais e os decorrentes de desgaste natural, deterioração pelo tempo ou vício de construção são de responsabilidade do LOCADOR, nos termos dos arts. 22 e 23 da Lei nº 8.245/1991.";

const INSPECTION_LINE =
  "As PARTES declaram ter vistoriado o IMÓVEL previamente à assinatura deste contrato, encontrando-o em condições adequadas à finalidade a que se destina, conforme Termo de Vistoria com registro fotográfico anexo (Anexo I), que passa a integrar este instrumento para todos os fins.";

const PRIVACY_LINE =
  "As PARTES declaram estar cientes de que os dados pessoais constantes deste instrumento serão tratados exclusivamente para as finalidades relacionadas à execução, fiscalização e eventual cobrança decorrente deste contrato, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais), sendo vedado o uso para finalidade diversa sem consentimento específico.";


describe("regras jurídicas do contrato residencial de referência", () => {
  it("não atribui ao locatário o desgaste normal do imóvel", () => {
    const result = applyLegalTemplateRule("contrato-locacao", MAINTENANCE_LINE, {});

    expect(result).toContain("danos causados por si");
    expect(result).toContain("desgaste natural");
    expect(result).not.toContain("reparos decorrentes do uso normal");
  });

  it("não afirma vistoria ou anexo quando eles não foram fornecidos", () => {
    const result = applyLegalTemplateRule("contrato-locacao", INSPECTION_LINE, {});

    expect(result).toBe("");
  });

  it("mantém a cláusula de proteção de dados vinculada ao contrato, sem inventar consentimento", () => {
    const result = applyLegalTemplateRule("contrato-locacao", PRIVACY_LINE, {});

    expect(result).toContain("execução deste contrato");
    expect(result).toContain("cumprimento de obrigações legais");
    expect(result).not.toContain("consentimento específico");
  });

  it("não mantém regra específica de seguro contra incêndio no modelo residencial", () => {
    const modelo = getModelo("contrato-locacao")!;
    const template = modelo.template.corpo.join("\n");

    expect(template).not.toContain("SEGURO CONTRA INCÊNDIO");
    expect(template).not.toContain("seguro_incendio_responsavel");
  });
});
