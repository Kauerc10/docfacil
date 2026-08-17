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
    // Fallback gracioso em ambientes de preview/staging onde a chave privada do Firebase Admin não foi configurada
    const env = getServerEnv();
    if (
      !env.FIREBASE_PRIVATE_KEY &&
      (env.ALLOW_DEMO_BILLING || env.ALLOW_IN_MEMORY_ARTIFACT_STORAGE || env.NODE_ENV !== "production")
    ) {
      try {
        const payloadBase64 = token.split(".")[1];
        if (payloadBase64) {
          const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
          const payload = JSON.parse(payloadJson);
          if (payload.user_id || payload.sub) {
            return {
              type: "user",
              userId: payload.user_id || payload.sub,
              email: payload.email,
            };
          }
        }
      } catch {
        // Ignora e segue para o throw de INVALID_AUTH_TOKEN
      }
    }

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
