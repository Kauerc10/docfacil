import "server-only";
import type { ServerEnv } from "../env";

export function assertProductionServerConfig(env: ServerEnv): void {
  if (env.NODE_ENV !== "production") return;

  const missing = [
    ["FIREBASE_PROJECT_ID", env.FIREBASE_PROJECT_ID],
    ["FIREBASE_CLIENT_EMAIL", env.FIREBASE_CLIENT_EMAIL],
    ["FIREBASE_PRIVATE_KEY", env.FIREBASE_PRIVATE_KEY],
    ["R2_ACCOUNT_ID", env.R2_ACCOUNT_ID],
    ["R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID],
    ["R2_SECRET_ACCESS_KEY", env.R2_SECRET_ACCESS_KEY],
    ["R2_BUCKET_NAME", env.R2_BUCKET_NAME],
  ].filter(([, value]) => !value);

  if (missing.length) {
    const missingKeys = missing.map(([k]) => k).join(", ");
    throw new Error(
      `DocFacil production backend configuration incomplete. Missing required environment variables: ${missingKeys}`
    );
  }

  if (!env.APP_CHECK_ENFORCED) {
    throw new Error("APP_CHECK_ENFORCED must be true in production.");
  }

  if (env.ALLOW_DEMO_BILLING) {
    throw new Error("Demo billing cannot be enabled in production.");
  }

  if (env.ALLOW_IN_MEMORY_ARTIFACT_STORAGE) {
    throw new Error("In-memory artifact storage cannot be enabled in production.");
  }
}
