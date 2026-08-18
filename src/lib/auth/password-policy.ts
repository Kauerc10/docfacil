type PasswordValidationStatusLike = {
  isValid: boolean;
  meetsMinPasswordLength?: boolean;
  meetsMaxPasswordLength?: boolean;
  containsLowercaseLetter?: boolean;
  containsUppercaseLetter?: boolean;
  containsNumericCharacter?: boolean;
  containsNonAlphanumericCharacter?: boolean;
  passwordPolicy?: {
    customStrengthOptions?: {
      minPasswordLength?: number;
      maxPasswordLength?: number;
    };
  };
};

type PasswordPolicyDependencies = {
  validateFirebasePassword: () => Promise<PasswordValidationStatusLike>;
};

const LOCAL_MIN_PASSWORD_LENGTH = 8;

/**
 * Mantém o requisito mínimo de produto (8 caracteres) e, quando disponível,
 * traduz a política configurada no Firebase para uma mensagem útil ao usuário.
 *
 * Falha de rede ao consultar a política não bloqueia o cadastro: o próprio
 * Firebase continuará sendo a autoridade no createUserWithEmailAndPassword.
 */
export async function validateSignupPassword(
  password: string,
  deps: PasswordPolicyDependencies
): Promise<string | null> {
  if (password.length < LOCAL_MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${LOCAL_MIN_PASSWORD_LENGTH} caracteres.`;
  }

  let status: PasswordValidationStatusLike;
  try {
    status = await deps.validateFirebasePassword();
  } catch {
    return null;
  }

  if (status.isValid) return null;

  const requirements: string[] = [];
  const minLength = status.passwordPolicy?.customStrengthOptions?.minPasswordLength;
  const maxLength = status.passwordPolicy?.customStrengthOptions?.maxPasswordLength;

  if (status.meetsMinPasswordLength === false) {
    requirements.push(
      minLength ? `pelo menos ${minLength} caracteres` : "mais caracteres"
    );
  }
  if (status.meetsMaxPasswordLength === false) {
    requirements.push(
      maxLength ? `no máximo ${maxLength} caracteres` : "menos caracteres"
    );
  }
  if (status.containsLowercaseLetter === false) {
    requirements.push("uma letra minúscula");
  }
  if (status.containsUppercaseLetter === false) {
    requirements.push("uma letra maiúscula");
  }
  if (status.containsNumericCharacter === false) {
    requirements.push("um número");
  }
  if (status.containsNonAlphanumericCharacter === false) {
    requirements.push("um caractere especial");
  }

  if (requirements.length === 0) {
    return "Escolha uma senha mais forte e tente novamente.";
  }

  return `Sua senha precisa ter ${requirements.join(", ")}.`;
}
