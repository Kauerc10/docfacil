import { mock } from "bun:test";

mock.module("server-only", () => {
  return {};
});

(process.env as any).NODE_ENV = "test";
process.env.ALLOW_DEMO_BILLING = "true";
process.env.APP_CHECK_ENFORCED = "false";
process.env.FIREBASE_PROJECT_ID = "docfacil-test";
process.env.R2_BUCKET_NAME = "docfacil-pdfs";
