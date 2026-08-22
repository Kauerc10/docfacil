import { defineConfig, devices } from "@playwright/test";

const E2E_FIREBASE_PROJECT_ID = "demo-docfacil-e2e";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["list"]]
    : "list",

  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: {
    command: "bun run next dev -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "development",
      FIREBASE_PROJECT_ID: E2E_FIREBASE_PROJECT_ID,
      ALLOW_DEMO_BILLING: "true",
      ALLOW_IN_MEMORY_ARTIFACT_STORAGE: "true",
      // Documentos continuam efêmeros no sandbox E2E; identidade e perfil usam
      // Firebase Auth + Firestore Emulator reais para testar o trust boundary.
      ALLOW_IN_MEMORY_REPOSITORIES: "true",
      APP_CHECK_ENFORCED: "false",
      NEXT_PUBLIC_CHECKOUT_PROVIDER: "demo",
      NEXT_PUBLIC_FIREBASE_API_KEY: "docfacil-e2e-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${E2E_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: E2E_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:docfacile2e",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: "http://127.0.0.1:9099",
      NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: "127.0.0.1",
      NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT: "8080",
    },
  },
});
