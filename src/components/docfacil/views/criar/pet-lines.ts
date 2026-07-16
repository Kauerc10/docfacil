/**
 * pet-lines — falas contextuais do mascote (Pet) durante o fluxo criar.
 *
 * Em vez de repetir apenas a pergunta da etapa, o Pet ora comenta o progresso,
 * ora celebra, ora empata com erros — dando personalidade e calor humano.
 *
 * A pergunta real da etapa continua aparecendo (no CampoPergunta label);
 * estas linhas são usadas como PREFÁCIO ou substituição do `petText` quando
 * apropriado, controlado pelo CriarView.
 *
 * Nome do mascote: "Selo" — a coruja-carimbo do DocFacil.
 */
export const PET_NAME = "Selo";

/** Falas de progresso, exibidas a cada N etapas concluídas. */
export const PROGRESS_LINES: Record<number, string[]> = {
  2: [
    "Já estamos a meio caminho!",
    "Tá indo super bem — continua!",
  ],
  3: [
    "Quase lá, falta pouco!",
    "Mais uns passinhos e tá pronto.",
  ],
};

/** Falas de erro/empatia (mood atencao). */
export const ERROR_LINES = [
  "Hmm, esse CPF não bateu — confere os dígitos pra mim?",
  "Algo não fecha aqui — dá uma conferida nesse campo?",
  "Ixi, esse dado parece estranho. Pode revisar?",
  "Deixa eu ver... esse número não tá válido. Pode conferir?",
];

/** Falas de comemoração na última etapa (antes de gerar). */
export const FINAL_CELEBRATION_LINES = [
  "Prontinho! Vou carimbar seu documento agora.",
  "Tudo certo! Só um instante enquanto preparo tudo.",
  "Perfeito! Carimbando seu documento...",
];

/**
 * Retorna uma fala de progresso para a etapa atual, ou null se não houver.
 * @param stepIndex índice 0-based da etapa atual
 * @param total total de etapas
 */
export function getProgressLine(stepIndex: number, total: number): string | null {
  if (total < 4) return null;
  const completed = stepIndex; // etapas já concluídas
  // meio do fluxo
  const midPoint = Math.floor(total / 2);
  if (completed === midPoint) {
    return pickRandom(PROGRESS_LINES[2]);
  }
  if (completed === total - 2) {
    return pickRandom(PROGRESS_LINES[3]);
  }
  return null;
}

/** Retorna uma fala de erro aleatória. */
export function getErrorLine(): string {
  return pickRandom(ERROR_LINES) ?? ERROR_LINES[0];
}

/** Retorna uma fala de comemoração final aleatória. */
export function getFinalCelebrationLine(): string {
  return pickRandom(FINAL_CELEBRATION_LINES) ?? FINAL_CELEBRATION_LINES[0];
}

function pickRandom(arr: string[]): string | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
