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
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
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
let authPersistenceReady: Promise<void> = Promise.resolve();

type FirebaseEmulatorConnectionState = {
  auth: boolean;
  firestore: boolean;
};

type FirebaseGlobal = typeof globalThis & {
  __docfacilFirebaseEmulators?: FirebaseEmulatorConnectionState;
};

function getEmulatorConnectionState(): FirebaseEmulatorConnectionState {
  const firebaseGlobal = globalThis as FirebaseGlobal;
  if (!firebaseGlobal.__docfacilFirebaseEmulators) {
    firebaseGlobal.__docfacilFirebaseEmulators = {
      auth: false,
      firestore: false,
    };
  }
  return firebaseGlobal.__docfacilFirebaseEmulators;
}

function connectClientEmulators(clientAuth: Auth, clientDb: Firestore): void {
  // Variáveis públicas explícitas são a única chave para o modo emulator.
  // NODE_ENV não participa da decisão para que nenhum build local/preview seja
  // redirecionado silenciosamente para um serviço de teste.
  const authEmulatorUrl = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
  const firestoreHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  const firestorePortRaw = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT;
  const firestorePort = firestorePortRaw ? Number(firestorePortRaw) : NaN;
  const state = getEmulatorConnectionState();

  if (authEmulatorUrl && !state.auth) {
    connectAuthEmulator(clientAuth, authEmulatorUrl, { disableWarnings: true });
    state.auth = true;
  }

  if (
    firestoreHost &&
    Number.isInteger(firestorePort) &&
    firestorePort > 0 &&
    !state.firestore
  ) {
    connectFirestoreEmulator(clientDb, firestoreHost, firestorePort);
    state.firestore = true;
  }
}

if (IS_FIREBASE_CONFIGURED && typeof window !== "undefined") {
  // Client-side only — Firebase Auth needs window.
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const clientAuth = getAuth(app);
  const clientDb = getFirestore(app);
  connectClientEmulators(clientAuth, clientDb);
  auth = clientAuth;
  db = clientDb;

  // Torna a política de sessão explícita. Se o navegador impedir o storage,
  // mantemos o Auth utilizável e registramos o problema; o login não deve ficar
  // preso por uma preferência de persistência que o próprio ambiente recusou.
  authPersistenceReady = setPersistence(clientAuth, browserLocalPersistence).catch(
    (error) => {
      console.warn(
        "[Firebase] Não foi possível configurar persistência local da sessão:",
        error
      );
    }
  );
}

export async function ensureAuthPersistence(): Promise<void> {
  await authPersistenceReady;
}

function isDisposableVercelPreview(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  if (!hostname.endsWith(".vercel.app")) return false;

  // Branch aliases usam "-git-" e deployments imutáveis da Vercel terminam
  // com o slug do time/projeto. Esses hosts mudam a cada preview e não devem
  // depender de um domínio reCAPTCHA registrado. O domínio oficial de produção
  // (ex.: docfacil-indol.vercel.app ou domínio próprio) não cai nesta regra.
  return hostname.includes("-git-") || hostname.endsWith("-projects.vercel.app");
}

function ensureClientAppCheck(): AppCheck | null {
  if (appCheck) return appCheck;
  if (appCheckInitializationAttempted) return null;
  if (!app || typeof window === "undefined") return null;

  appCheckInitializationAttempted = true;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;

  if (!siteKey) return null;

  // O backend já não aplica App Check em Vercel Preview. Evita pedir um token
  // reCAPTCHA para um hostname descartável que não está registrado no provider.
  // Se um debug token foi configurado explicitamente, ainda permitimos App Check.
  if (isDisposableVercelPreview() && !debugToken) {
    return null;
  }

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
