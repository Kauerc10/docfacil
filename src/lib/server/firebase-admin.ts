import "server-only";
import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAppCheck, type AppCheck } from "firebase-admin/app-check";
import { getServerEnv } from "./env";
import { assertProductionServerConfig } from "./config/assert-production-config";

let adminApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApp();
    return adminApp;
  }

  const env = getServerEnv();
  assertProductionServerConfig(env);

  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    adminApp = initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY,
      }),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  } else {
    adminApp = initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }

  return adminApp;
}

let testAuth: Auth | null = null;
let testAppCheck: AppCheck | null = null;

export function getAdminAuth(): Auth {
  if (testAuth) return testAuth;
  return getAuth(getFirebaseAdminApp());
}

export function setAdminAuthForTesting(mock: Auth | null): void {
  testAuth = mock;
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminAppCheck(): AppCheck {
  if (testAppCheck) return testAppCheck;
  return getAppCheck(getFirebaseAdminApp());
}

export function setAdminAppCheckForTesting(mock: AppCheck | null): void {
  testAppCheck = mock;
}
