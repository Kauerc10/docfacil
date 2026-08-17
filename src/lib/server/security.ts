import "server-only";
import { type Auth } from "firebase-admin/auth";
import { type AppCheck } from "firebase-admin/app-check";
import { getAdminAuth, getAdminAppCheck } from "./firebase-admin";
import { BackendError } from "./errors";
import { getServerEnv } from "./env";

export type Principal =
  | { type: "guest" }
  | { type: "user"; userId: string; email?: string };

export async function resolvePrincipal(
  req: Request,
  authAdmin?: Auth
): Promise<Principal> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");

  if (!authHeader || !authHeader.trim()) {
    return { type: "guest" };
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1].trim()) {
    throw new BackendError(
      "INVALID_AUTH_TOKEN",
      401,
      "Cabeçalho Authorization inválido. Esperado 'Bearer <token>'."
    );
  }

  const token = parts[1].trim();

  try {
    const auth = authAdmin || getAdminAuth();
    const decoded = await auth.verifyIdToken(token);

    return {
      type: "user",
      userId: decoded.uid,
      email: decoded.email,
    };
  } catch {
    throw new BackendError(
      "INVALID_AUTH_TOKEN",
      401,
      "Token de autenticação expirado ou inválido."
    );
  }
}

export function requireUser(principal: Principal): { userId: string; email?: string } {
  if (principal.type !== "user") {
    throw new BackendError(
      "INVALID_AUTH_TOKEN",
      401,
      "Autenticação obrigatória para esta operação."
    );
  }

  return {
    userId: principal.userId,
    email: principal.email,
  };
}

export async function requireAppCheck(
  req: Request,
  appCheckAdmin?: AppCheck,
  enforceOverride?: boolean
): Promise<void> {
  const isEnforced =
    typeof enforceOverride === "boolean"
      ? enforceOverride
      : getServerEnv().APP_CHECK_ENFORCED;

  if (!isEnforced) {
    return;
  }

  const appCheckToken =
    req.headers.get("X-Firebase-AppCheck") || req.headers.get("x-firebase-appcheck");

  if (!appCheckToken || !appCheckToken.trim()) {
    throw new BackendError(
      "APP_CHECK_REQUIRED",
      401,
      "App Check token obrigatório para esta requisição."
    );
  }

  try {
    const appCheck = appCheckAdmin || getAdminAppCheck();
    await appCheck.verifyToken(appCheckToken.trim());
  } catch {
    throw new BackendError(
      "APP_CHECK_INVALID",
      401,
      "App Check token inválido ou expirado."
    );
  }
}
