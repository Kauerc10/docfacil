import {
  confirmPasswordReset,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
} from "firebase/auth";
import {
  auth,
  ensureAuthPersistence,
  IS_FIREBASE_CONFIGURED,
} from "@/lib/firebase";

type PasswordResetDependencies = {
  sendReset: (email: string) => Promise<void>;
  verifyCode: (code: string) => Promise<string>;
  confirmReset: (code: string, password: string) => Promise<void>;
};

function authErrorCode(error: unknown): string {
  return (error as { code?: string })?.code || "";
}

export function createPasswordResetService(deps: PasswordResetDependencies) {
  return {
    async requestPasswordReset(email: string): Promise<void> {
      try {
        await deps.sendReset(email.trim());
      } catch (error) {
        if (authErrorCode(error) === "auth/user-not-found") return;
        throw error;
      }
    },

    async verifyPasswordReset(code: string): Promise<{ email: string }> {
      return { email: await deps.verifyCode(code) };
    },

    async completePasswordReset(
      code: string,
      newPassword: string
    ): Promise<void> {
      await deps.confirmReset(code, newPassword);
    },
  };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "seu e-mail";

  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
}

export function parsePasswordResetAction(
  search: string
): { code: string } | null {
  const params = new URLSearchParams(search);
  if (params.get("mode") !== "resetPassword") return null;

  const code = params.get("oobCode")?.trim();
  return code ? { code } : null;
}

function firebaseService() {
  const clientAuth = auth;
  if (!IS_FIREBASE_CONFIGURED || !clientAuth) return null;

  return createPasswordResetService({
    sendReset: async (email) => {
      await ensureAuthPersistence();
      clientAuth.languageCode = "pt-BR";
      await sendPasswordResetEmail(clientAuth, email);
    },
    verifyCode: (code) => verifyPasswordResetCode(clientAuth, code),
    confirmReset: (code, password) =>
      confirmPasswordReset(clientAuth, code, password),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const service = firebaseService();
  if (!service) return;
  await service.requestPasswordReset(email);
}

export async function verifyPasswordReset(
  code: string
): Promise<{ email: string }> {
  const service = firebaseService();
  if (!service) throw new Error("RESET_UNAVAILABLE");
  return service.verifyPasswordReset(code);
}

export async function completePasswordReset(
  code: string,
  newPassword: string
): Promise<void> {
  const service = firebaseService();
  if (!service) throw new Error("RESET_UNAVAILABLE");
  await service.completePasswordReset(code, newPassword);
}
