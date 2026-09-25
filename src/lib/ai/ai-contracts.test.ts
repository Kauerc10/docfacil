import { describe, expect, test } from "bun:test";
import { AI_CORPUS, retrieveClauses } from "./corpus";
import { aiDraftSchema, validateDraft } from "./types";

describe("corpus de cláusulas", () => {
  test("mantém origem, versão e identificadores únicos", () => {
    expect(AI_CORPUS.length).toBeGreaterThan(9);
    expect(new Set(AI_CORPUS.map((reference) => reference.id)).size).toBe(AI_CORPUS.length);
    expect(AI_CORPUS.every((reference) => Boolean(reference.source && reference.version && reference.category))).toBe(true);
  });

  test("recupera referência pertinente para comodato e locação", () => {
    const loan = retrieveClauses("empréstimo gratuito de notebook por comodato");
    const rent = retrieveClauses("aluguel de imóvel urbano residencial");
    expect(loan.some((reference) => reference.id === "cc-579")).toBe(true);
    expect(rent.some((reference) => reference.id === "inquilinato-1")).toBe(true);
  });
});

describe("validação de rascunhos de IA", () => {
  const references = [AI_CORPUS.find((entry) => entry.id === "cc-579")!];
  const good = aiDraftSchema.parse({
    title: "Termo de empréstimo de equipamento",
    sections: [
      { title: "Objeto", paragraphs: ["Ana entrega um notebook a Bruno para uso por trinta dias."] },
      { title: "Devolução", paragraphs: ["Bruno devolverá o notebook a Ana ao término do prazo acordado."] },
    ],
    referenceIds: ["cc-579"],
  });

  test("aceita texto estruturado com referências recuperadas", () => {
    expect(validateDraft(good, references, {})).toEqual([]);
  });

  test("bloqueia citações inventadas e marcadores de preenchimento", () => {
    const draft = { ...good, referenceIds: ["lei-inventada"], sections: [
      { ...good.sections[0], paragraphs: ["Ana entrega o bem a {{nome_do_recebedor}} por trinta dias."] },
      good.sections[1],
    ] };
    const issues = validateDraft(draft, references, {});
    expect(issues).toContain("O documento cita uma referência não recuperada.");
    expect(issues).toContain("O documento contém marcador ou HTML não resolvido.");
  });

  test("invalida texto incompleto após edição", () => {
    const draft = { ...good, sections: [{ ...good.sections[0], paragraphs: [""] }, good.sections[1]] };
    expect(validateDraft(draft, references, {})).toContain("Preencha o título, as seções e os parágrafos antes de aprovar.");
  });
});
