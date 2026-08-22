const CIVIL_STATUS_ALIASES: Record<string, string> = {
  so: "solteiro(a)",
  solteiro: "solteiro(a)",
  solteira: "solteiro(a)",
  "solteiro(a)": "solteiro(a)",
  ca: "casado(a)",
  casado: "casado(a)",
  casada: "casado(a)",
  "casado(a)": "casado(a)",
  di: "divorciado(a)",
  div: "divorciado(a)",
  divorciado: "divorciado(a)",
  divorciada: "divorciado(a)",
  "divorciado(a)": "divorciado(a)",
  vi: "viúvo(a)",
  viuvo: "viúvo(a)",
  viuva: "viúvo(a)",
  "viuvo(a)": "viúvo(a)",
  ue: "em união estável",
  "uniao estavel": "em união estável",
  "em uniao estavel": "em união estável",
  separado: "separado(a) judicialmente",
  separada: "separado(a) judicialmente",
  "separado(a) judicialmente": "separado(a) judicialmente",
};

function normalize(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function normalizeCivilStatus(value: string): string | null {
  return CIVIL_STATUS_ALIASES[normalize(value)] ?? null;
}
