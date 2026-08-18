/**
 * Firebase initialization — gracefully degrades to "demo mode" when
 * credentials aren't configured.
 *
 * Strategy:
 * - If NEXT_PUBLIC_FIREBASE_* env vars are present → real Firebase (Auth + Firestore)
 * - If absent → IS_FIREBASE_CONFIGURED = false, services fall back to local data
 *
 * App Check is intentionally lazy. Initializing reCAPTCHA while this module is
 * evaluated can run before React finishes hydration and before the document is
 * stable. We only need an App Check token for calls to our protected backend,
 * so initialization happens on the first getClientAppCheckToken() call.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
  getToken,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const IS_FIREBASE_CONFIGURED = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let appCheck: AppCheck | null = null;
let appCheckInitializationAttempted = false;

if (IS_FIREBASE_CONFIGURED && typeof window !== "undefined") {
  // Client-side only — Firebase Auth needs window.
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

function ensureClientAppCheck(): AppCheck | null {
  if (appCheck) return appCheck;
  if (appCheckInitializationAttempted) return null;
  if (!app || typeof window === "undefined") return null;

  appCheckInitializationAttempted = true;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;

  if (!siteKey) return null;

  if (debugToken) {
    (self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string })
      .FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
  }

  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    return appCheck;
  } catch (error) {
    // Keep authentication usable even if App Check cannot initialize. Protected
    // backend calls will fail closed when APP_CHECK_ENFORCED=true rather than
    // poisoning unrelated screens such as login/cadastro.
    console.warn("[Firebase] Não foi possível inicializar o App Check:", error);
    return null;
  }
}

export async function getClientAppCheckToken(): Promise<string | null> {
  const instance = ensureClientAppCheck();
  if (!instance) return null;

  try {
    const result = await getToken(instance, false);
    return result.token;
  } catch (error) {
    console.warn("[Firebase] Não foi possível obter token do App Check:", error);
    return null;
  }
}

export { app, auth, db, appCheck };
