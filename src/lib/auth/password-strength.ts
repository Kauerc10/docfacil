export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrengthResult = {
  score: PasswordStrengthScore | null;
  label: string;
  feedback: string;
  percent: number;
};

const EMPTY_STRENGTH: PasswordStrengthResult = {
  score: null,
  label: "",
  feedback: "",
  percent: 0,
};

const LABELS: Record<PasswordStrengthScore, string> = {
  0: "Muito fraca",
  1: "Fraca",
  2: "Razoável",
  3: "Boa",
  4: "Forte",
};

const DEFAULT_FEEDBACK: Record<PasswordStrengthScore, string> = {
  0: "Evite senhas comuns e tente usar uma frase mais longa.",
  1: "Tente aumentar o tamanho e evitar padrões previsíveis.",
  2: "Está razoável. Mais alguns caracteres podem melhorar.",
  3: "Boa senha. Quanto mais longa e imprevisível, melhor.",
  4: "Senha forte.",
};

async function createEstimator() {
  const [core, common, english, portuguese] = await Promise.all([
    import("@zxcvbn-ts/core"),
    import("@zxcvbn-ts/language-common"),
    import("@zxcvbn-ts/language-en"),
    import("@zxcvbn-ts/language-pt-br"),
  ]);

  return new core.ZxcvbnFactory({
    translations: portuguese.translations,
    graphs: common.adjacencyGraphs,
    dictionary: {
      ...common.dictionary,
      ...english.dictionary,
      ...portuguese.dictionary,
      userInputs: ["DocFácil", "DocFacil", "K-HUB", "KHub"],
    },
    useLevenshtein: true,
  });
}

let estimatorPromise: ReturnType<typeof createEstimator> | null = null;

function getEstimator() {
  estimatorPromise ??= createEstimator();
  return estimatorPromise;
}

function normalizeScore(value: number): PasswordStrengthScore {
  return Math.min(4, Math.max(0, Math.round(value))) as PasswordStrengthScore;
}

export async function estimatePasswordStrength(
  password: string,
  userInputs: string[] = []
): Promise<PasswordStrengthResult> {
  if (!password) return EMPTY_STRENGTH;

  const estimator = await getEstimator();
  const context = userInputs.map((value) => value.trim()).filter(Boolean);
  const result = estimator.check(password, context);
  const score = normalizeScore(result.score);
  const translatedFeedback = [
    result.feedback.warning,
    ...(result.feedback.suggestions ?? []),
  ]
    .map((value) => value?.trim())
    .find(Boolean);

  return {
    score,
    label: LABELS[score],
    feedback: translatedFeedback || DEFAULT_FEEDBACK[score],
    percent: (score + 1) * 20,
  };
}
