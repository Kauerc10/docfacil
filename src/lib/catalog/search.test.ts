import { expect, test } from "bun:test";
import { PUBLIC_MODELS } from "./public-models";
import { normalizeSearch, searchPublicModels } from "./search";

test("trata acentos e caixa como detalhes da conversa", () => {
  expect(normalizeSearch(" Procuração ")).toBe("procuracao");
  expect(searchPublicModels(PUBLIC_MODELS, "procuracao").some((model) => normalizeSearch(model.nome).includes("procuracao"))).toBe(true);
});

test("encontra documentos pela intenção", () => {
  expect(searchPublicModels(PUBLIC_MODELS, "aluguel")[0]?.slug).toBe("contrato-locacao");
});
