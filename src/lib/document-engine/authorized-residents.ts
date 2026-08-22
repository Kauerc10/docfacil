export interface MoradorAutorizado {
  nome: string;
  cpf?: string;
}

const MAX_MORADORES_AUTORIZADOS = 4;

function normalizeResident(value: unknown, allowEmptyName = false): MoradorAutorizado | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const nome = typeof candidate.nome === "string" ? candidate.nome.trim() : "";
  const cpf = typeof candidate.cpf === "string" ? candidate.cpf.trim() : "";
  if (!nome && !allowEmptyName) return null;
  return cpf ? { nome, cpf } : { nome };
}

/** Lê os valores do formulário, inclusive um cartão ainda em preenchimento. */
export function deserializeMoradoresAutorizados(value: string | undefined): MoradorAutorizado[] {
  if (!value?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((resident) => normalizeResident(resident, true))
      .filter((resident): resident is MoradorAutorizado => resident !== null)
      .slice(0, MAX_MORADORES_AUTORIZADOS);
  } catch {
    return [];
  }
}

/** Lê somente moradores completos para uso no documento. */
export function parseMoradoresAutorizados(value: string | undefined): MoradorAutorizado[] {
  return deserializeMoradoresAutorizados(value).filter((resident) => Boolean(resident.nome));
}

export function serializeMoradoresAutorizados(residents: MoradorAutorizado[]): string {
  return JSON.stringify(
    residents
      .map((resident) => normalizeResident(resident, true))
      .filter((resident): resident is MoradorAutorizado => resident !== null)
      .slice(0, MAX_MORADORES_AUTORIZADOS)
  );
}

/** Impede que um payload manual contorne o formulário com dados incompletos. */
export function hasInvalidMoradoresAutorizados(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > MAX_MORADORES_AUTORIZADOS) return true;
    return parsed.some((resident) => normalizeResident(resident) === null);
  } catch {
    return true;
  }
}

export function formatMoradoresAutorizadosClause(value: string | undefined): string {
  const residents = parseMoradoresAutorizados(value);
  if (residents.length === 0) return "";

  const listed = residents
    .map((resident) => `${resident.nome}${resident.cpf ? `, CPF nº ${resident.cpf}` : ""}`)
    .join("; ");

  return `Além do LOCATÁRIO, ficam autorizados a residir no IMÓVEL: ${listed}. Essas pessoas são identificadas exclusivamente como ocupantes autorizados e não assumem, por essa indicação, a condição de LOCATÁRIOS, FIADORES ou responsáveis pelas obrigações deste contrato.`;
}
