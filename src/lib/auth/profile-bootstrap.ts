export function resolveInitialProfileName(params: {
  pendingSignupName?: string | null;
  firebaseDisplayName?: string | null;
}): string {
  const pendingSignupName = params.pendingSignupName?.trim();
  if (pendingSignupName) return pendingSignupName;

  const firebaseDisplayName = params.firebaseDisplayName?.trim();
  if (firebaseDisplayName) return firebaseDisplayName;

  return "Usuário";
}
