import { MODELOS } from "@/lib/modelos";
import type { ClauseReference } from "./types";

// O catálogo é a fonte editável. O índice é derivado de forma determinística.
const legalReferences: ClauseReference[] = [
  { id: "cc-421", text: "A liberdade contratual será exercida nos limites da função social do contrato.", source: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm#art421", version: "Lei 10.406/2002, texto compilado", category: "contrato", context: "general", kind: "legislation" },
  { id: "cc-481", text: "Na compra e venda, um contratante se obriga a transferir o domínio de certa coisa e o outro a pagar-lhe certo preço em dinheiro.", source: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm#art481", version: "Lei 10.406/2002, texto compilado", category: "compra venda", context: "private", kind: "legislation" },
  { id: "cc-579", text: "O comodato é o empréstimo gratuito de coisas não fungíveis.", source: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm#art579", version: "Lei 10.406/2002, texto compilado", category: "comodato empréstimo", context: "private", kind: "legislation" },
  { id: "cc-653", text: "Opera-se o mandato quando alguém recebe de outrem poderes para, em seu nome, praticar atos ou administrar interesses.", source: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm#art653", version: "Lei 10.406/2002, texto compilado", category: "procuração mandato autorização", context: "private", kind: "legislation" },
  { id: "inquilinato-1", text: "A locação de imóvel urbano regula-se pela Lei 8.245/1991, observadas as exceções do seu artigo 1º.", source: "https://www.planalto.gov.br/ccivil_03/leis/l8245compilado.htm", version: "Lei 8.245/1991, texto compilado", category: "locação aluguel imóvel urbano", context: "private", kind: "legislation" },
  { id: "lgpd-6", text: "O tratamento de dados pessoais deve observar finalidade, adequação, necessidade e transparência.", source: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm#art6", version: "Lei 13.709/2018, texto compilado", category: "dados pessoais privacidade", context: "general", kind: "legislation" },
  { id: "creci-ms-comodato", text: "Exemplo público de estrutura de contrato de comodato de imóvel; suas condições específicas não se aplicam automaticamente a outros casos.", source: "https://www.crecims.gov.br/docs/modelosdecontratos/contrato_de_comodato.pdf", version: "modelo público consultado em 2026-09", category: "comodato imóvel", context: "private", kind: "official_example" },
];

export const AI_CORPUS: ClauseReference[] = [
  ...legalReferences,
  ...MODELOS.flatMap((model) => model.template.corpo
    .filter((line) => line.trim().length > 35)
    .map((line, index) => ({
      id: `catalog:${model.slug}:${index}`,
      text: line,
      source: `catalog:${model.slug}`,
      version: "git:catalog-v1",
      category: `${model.categoria} ${model.nome}`,
      context: "private" as const,
      kind: "internal_template" as const,
    }))),
];

const synonyms: Record<string, string[]> = {
  aluguel: ["locação", "inquilino", "locador"],
  empréstimo: ["comodato", "emprestar", "devolução"],
  autorização: ["procuração", "mandato", "representante"],
  equipamento: ["bem", "objeto", "coisa"],
};

function words(value: string): Set<string> {
  return new Set(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
}

export function retrieveClauses(query: string, limit = 8): ClauseReference[] {
  const terms = words(query);
  for (const [key, values] of Object.entries(synonyms)) {
    if (terms.has([...words(key)][0])) values.forEach((v) => words(v).forEach((w) => terms.add(w)));
  }
  return AI_CORPUS.map((entry) => {
    const category = words(entry.category);
    const body = words(entry.text);
    const score = [...terms].reduce((sum, term) => sum + (category.has(term) ? 4 : 0) + (body.has(term) ? 1 : 0), 0);
    return { entry, score };
  }).filter(({ entry, score }) => score > 0 && entry.context !== "general" || score > 0 && entry.kind === "legislation")
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit).map(({ entry }) => entry);
}
