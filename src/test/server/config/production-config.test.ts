import { describe, expect, it } from "bun:test";
import { assertProductionServerConfig } from "@/lib/server/config/assert-production-config";
import type { ServerEnv } from "@/lib/server/env";

describe("Production Server Configuration Assertions (Fail-Closed)", () => {
  const validProductionEnv: ServerEnv = {
    NODE_ENV: "production",
    FIREBASE_PROJECT_ID: "docfacil-prod",
    FIREBASE_CLIENT_EMAIL: "admin@docfacil-prod.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----",
    R2_ACCOUNT_ID: "cf_account_123",
    R2_ACCESS_KEY_ID: "r2_key_123",
    R2_SECRET_ACCESS_KEY: "r2_secret_123",
    R2_BUCKET_NAME: "docfacil-pdfs-prod",
    APP_CHECK_ENFORCED: true,
    ALLOW_DEMO_BILLING: false,
    ALLOW_IN_MEMORY_ARTIFACT_STORAGE: false,
    NEXT_PUBLIC_APP_URL: "https://docfacil.com",
  };

  it("passes when all production requirements are satisfied", () => {
    expect(() => assertProductionServerConfig(validProductionEnv)).not.toThrow();
  });

  it("fails closed when Firebase credentials are missing in production", () => {
    const invalid = { ...validProductionEnv, FIREBASE_PRIVATE_KEY: undefined };
    expect(() => assertProductionServerConfig(invalid as any)).toThrow(
      /production backend configuration incomplete/i
    );
  });

  it("fails closed when R2 credentials are missing in production", () => {
    const invalid = { ...validProductionEnv, R2_BUCKET_NAME: undefined };
    expect(() => assertProductionServerConfig(invalid as any)).toThrow(
      /production backend configuration incomplete/i
    );
  });

  it("fails closed when APP_CHECK_ENFORCED is false in production", () => {
    const invalid = { ...validProductionEnv, APP_CHECK_ENFORCED: false };
    expect(() => assertProductionServerConfig(invalid)).toThrow(/APP_CHECK_ENFORCED/i);
  });

  it("fails closed when ALLOW_DEMO_BILLING is true in production", () => {
    const invalid = { ...validProductionEnv, ALLOW_DEMO_BILLING: true };
    expect(() => assertProductionServerConfig(invalid)).toThrow(/Demo billing/i);
  });

  it("fails closed when ALLOW_IN_MEMORY_ARTIFACT_STORAGE is true in production", () => {
    const invalid = { ...validProductionEnv, ALLOW_IN_MEMORY_ARTIFACT_STORAGE: true };
    expect(() => assertProductionServerConfig(invalid)).toThrow(/In-memory artifact storage/i);
  });

  it("allows partial credentials in development environment", () => {
    const devEnv: ServerEnv = {
      NODE_ENV: "development",
      FIREBASE_PROJECT_ID: "dev-proj",
      FIREBASE_CLIENT_EMAIL: undefined,
      FIREBASE_PRIVATE_KEY: undefined,
      R2_ACCOUNT_ID: undefined,
      R2_ACCESS_KEY_ID: undefined,
      R2_SECRET_ACCESS_KEY: undefined,
      R2_BUCKET_NAME: "docfacil-pdfs",
      APP_CHECK_ENFORCED: false,
      ALLOW_DEMO_BILLING: true,
      ALLOW_IN_MEMORY_ARTIFACT_STORAGE: true,
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    };
    expect(() => assertProductionServerConfig(devEnv)).not.toThrow();
  });
});
