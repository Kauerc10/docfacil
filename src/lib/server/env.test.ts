import { describe, expect, it } from "bun:test";
import { parseServerEnv } from "./env";

describe("server env validation", () => {
  it("parses valid environment configurations with defaults", () => {
    const raw = {
      NODE_ENV: "test",
      FIREBASE_PROJECT_ID: "docfacil-test",
      R2_ACCOUNT_ID: "acc-123",
      R2_ACCESS_KEY_ID: "key-123",
      R2_SECRET_ACCESS_KEY: "secret-123",
      R2_BUCKET_NAME: "docfacil-pdfs",
      ALLOW_DEMO_BILLING: "true",
      APP_CHECK_ENFORCED: "false",
    };

    const env = parseServerEnv(raw);
    expect(env.FIREBASE_PROJECT_ID).toBe("docfacil-test");
    expect(env.R2_ACCOUNT_ID).toBe("acc-123");
    expect(env.R2_ACCESS_KEY_ID).toBe("key-123");
    expect(env.R2_SECRET_ACCESS_KEY).toBe("secret-123");
    expect(env.R2_BUCKET_NAME).toBe("docfacil-pdfs");
    expect(env.ALLOW_DEMO_BILLING).toBe(true);
    expect(env.APP_CHECK_ENFORCED).toBe(false);
  });

  it("falls back FIREBASE_PROJECT_ID to NEXT_PUBLIC_FIREBASE_PROJECT_ID if unset", () => {
    const raw = {
      NODE_ENV: "test",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "fallback-project",
      R2_ACCOUNT_ID: "acc-123",
      R2_ACCESS_KEY_ID: "key-123",
      R2_SECRET_ACCESS_KEY: "secret-123",
    };

    const env = parseServerEnv(raw);
    expect(env.FIREBASE_PROJECT_ID).toBe("fallback-project");
    expect(env.R2_BUCKET_NAME).toBe("docfacil-pdfs");
  });

  it("handles boolean string conversions correctly", () => {
    const raw = {
      FIREBASE_PROJECT_ID: "docfacil-test",
      R2_ACCOUNT_ID: "acc-123",
      R2_ACCESS_KEY_ID: "key-123",
      R2_SECRET_ACCESS_KEY: "secret-123",
      ALLOW_DEMO_BILLING: "false",
      APP_CHECK_ENFORCED: "true",
    };

    const env = parseServerEnv(raw);
    expect(env.ALLOW_DEMO_BILLING).toBe(false);
    expect(env.APP_CHECK_ENFORCED).toBe(true);
  });

  it("handles formatted private keys with escaped newlines", () => {
    const raw = {
      FIREBASE_PROJECT_ID: "docfacil-test",
      FIREBASE_CLIENT_EMAIL: "admin@docfacil.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD\\n-----END PRIVATE KEY-----\\n",
      R2_ACCOUNT_ID: "acc-123",
      R2_ACCESS_KEY_ID: "key-123",
      R2_SECRET_ACCESS_KEY: "secret-123",
    };

    const env = parseServerEnv(raw);
    expect(env.FIREBASE_PRIVATE_KEY).toContain("\n");
    expect(env.FIREBASE_PRIVATE_KEY).not.toContain("\\n");
  });
});
