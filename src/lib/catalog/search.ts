export type PublicModel = {
  slug: string;
  nome: string;
  descricao: string;
  quandoUsar: string;
  categoria: string;
  aliases: string[];
  minutos: number;
  free: boolean;
  popular: boolean;
};

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function searchPublicModels(models: PublicModel[], query: string): PublicModel[] {
  const needle = normalizeSearch(query);
  if (!needle) return models;
  return models.filter((model) => normalizeSearch([
    model.nome, model.descricao, model.quandoUsar, model.categoria, ...model.aliases,
  ].join(" ")).includes(needle));
}
