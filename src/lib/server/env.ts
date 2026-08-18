import "server-only";
import { z } from "zod";

const booleanString = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === "boolean") return val;
    return val.toLowerCase() === "true" || val === "1";
  });

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1)
    .optional()
    .transform((key) => (key ? key.replace(/\\n/g, "\n") : undefined)),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  ALLOW_DEMO_BILLING: booleanString.default(false),
  ALLOW_IN_MEMORY_ARTIFACT_STORAGE: booleanString.default(false),
  APP_CHECK_ENFORCED: booleanString.default(false),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema> & {
  FIREBASE_PROJECT_ID: string;
};

export function parseServerEnv(raw: Record<string, unknown> = process.env): ServerEnv {
  const parsed = serverEnvSchema.parse(raw);
  const projectId = parsed.FIREBASE_PROJECT_ID || parsed.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "docfacil-dev";

  return {
    ...parsed,
    FIREBASE_PROJECT_ID: projectId,
  };
}

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = parseServerEnv(process.env);
  }
  return cachedEnv;
}
