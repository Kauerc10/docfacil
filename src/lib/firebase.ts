/**
 * Firebase initialization — gracefully degrades to "demo mode" when
 * credentials aren't configured.
 *
 * Strategy:
 * - If NEXT_PUBLIC_FIREBASE_* env vars are present → real Firebase (Auth + Firestore)
 * - If absent → IS_FIREBASE_CONFIGURED = false, services fall back to local data
 *
 * This lets the app ship & demo TODAY, and flip to production the moment
 * credentials are added to .env — without touching any view code.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

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

if (IS_FIREBASE_CONFIGURED && typeof window !== "undefined") {
  // Client-side only — Firebase Auth needs window.
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
