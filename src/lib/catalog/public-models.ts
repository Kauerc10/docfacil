import { isMonthlyFreeModel } from "@/lib/document-access-policy";
import { MODELOS } from "@/lib/modelos";
import type { PublicModel } from "./search";

const ALIASES: Record<string, string[]> = {
  "contrato-locacao": ["aluguel", "alugar", "inquilino"],
  "declaracao-residencia": ["comprovante", "endereco", "moradia"],
  procuracao: ["representar", "poderes"],
  comodato: ["emprestimo", "emprestar"],
};

export const PUBLIC_MODELS: PublicModel[] = MODELOS.map((model) => ({
  slug: model.slug,
  nome: model.nome,
  descricao: model.desc,
  quandoUsar: model.quandoUsar,
  categoria: model.categoria,
  aliases: ALIASES[model.slug] ?? [],
  minutos: model.minutos,
  free: isMonthlyFreeModel(model.slug),
  popular: Boolean(model.popular),
}));
