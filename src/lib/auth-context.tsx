"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, IS_FIREBASE_CONFIGURED } from "./firebase";
import { MODELOS } from "./modelos";
import type { AppUser, PerfilUsuario } from "./types";

/**
 * AuthContext — exposes the current user and auth actions.
 *
 * Two modes:
 * - Firebase configured: real Firebase Auth (Google popup, email/password),
 *   user profile synced to Firestore (collection "users").
 * - Demo mode (no credentials): localStorage-backed mock so the team can
 *   click through auth-gated screens immediately. The mock user persists
 *   across reloads and mimics the real API shape.
 *
 * Views consume `useAuth()` — they don't know which mode is active.
 */

type AuthState = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (nome: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileData: (data: Partial<Pick<PerfilUsuario, "nome" | "telefone">>) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const DEMO_USER_KEY = "docfacil:demo-user";

// --- Demo-mode helpers (localStorage) ---
function loadDemoUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}
function saveDemoUser(u: AppUser | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(DEMO_USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(DEMO_USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy init: in demo mode we can read localStorage synchronously on first
  // render — no effect needed, no cascading renders. In Firebase mode we
  // start null + loading=true and resolve via onAuthStateChanged.
  const [user, setUser] = useState<AppUser | null>(() => {
    if (!IS_FIREBASE_CONFIGURED) return loadDemoUser();
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => IS_FIREBASE_CONFIGURED);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to Firebase Auth state changes (only in Firebase mode).
  useEffect(() => {
    if (!IS_FIREBASE_CONFIGURED || !auth) return;

    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (cancelled) return;
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Load (or create) the user profile from Firestore
      let perfil: PerfilUsuario | null = null;
      if (db) {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          perfil = snap.data() as PerfilUsuario;
        } else {
          // First login → create profile
          perfil = {
            uid: fbUser.uid,
            nome: fbUser.displayName || "Usuário",
            email: fbUser.email || "",
            fotoUrl: fbUser.photoURL || undefined,
            plano: "gratis",
            criadoEm: Date.now(),
            atualizadoEm: Date.now(),
          };
          await setDoc(ref, perfil);
        }
      }
      if (cancelled) return;
      setUser({
        uid: fbUser.uid,
        nome: perfil?.nome || fbUser.displayName || "Usuário",
        email: fbUser.email || "",
        fotoUrl: perfil?.fotoUrl || fbUser.photoURL || undefined,
        plano: perfil?.plano || "gratis",
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!IS_FIREBASE_CONFIGURED || !auth) {
      // Demo mode
      const demo: AppUser = {
        uid: `demo-${Date.now()}`,
        nome: "Usuário Demo",
        email: "demo@docfacil.com",
        plano: "gratis",
      };
      saveDemoUser(demo);
      setUser(demo);
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError(translateAuthError(e));
      throw e;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    if (!IS_FIREBASE_CONFIGURED || !auth) {
      const demo: AppUser = {
        uid: `demo-${Date.now()}`,
        nome: email.split("@")[0] || "Usuário Demo",
        email,
        plano: "gratis",
      };
      saveDemoUser(demo);
      setUser(demo);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(translateAuthError(e));
      throw e;
    }
  }, []);

  const signUpWithEmail = useCallback(async (nome: string, email: string, password: string) => {
    setError(null);
    if (!IS_FIREBASE_CONFIGURED || !auth) {
      const demo: AppUser = {
        uid: `demo-${Date.now()}`,
        nome,
        email,
        plano: "gratis",
      };
      saveDemoUser(demo);
      setUser(demo);
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: nome });
      // Profile doc created by onAuthStateChanged bootstrap
    } catch (e) {
      setError(translateAuthError(e));
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!IS_FIREBASE_CONFIGURED || !auth) {
      saveDemoUser(null);
      setUser(null);
      return;
    }
    await fbSignOut(auth);
  }, []);

  const updateProfileData = useCallback(
    async (data: Partial<Pick<PerfilUsuario, "nome" | "telefone">>) => {
      if (!user) return;
      if (IS_FIREBASE_CONFIGURED && db) {
        const ref = doc(db, "users", user.uid);
        await setDoc(ref, { ...data, atualizadoEm: Date.now() }, { merge: true });
      }
      setUser({ ...user, nome: data.nome ?? user.nome });
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, updateProfileData }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Traduz mensagens de erro do Firebase Auth para PT-BR amigável. */
function translateAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Conta desativada.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "Senha muito fraca. Use pelo menos 6 caracteres.",
    "auth/popup-closed-by-user": "Janela de login fechada antes de concluir.",
    "auth/cancelled-popup-request": "Login cancelado.",
    "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente em alguns minutos.",
  };
  return map[code] || "Algo deu errado. Tente novamente.";
}

/** Re-exporta os modelos locais para uso no demo mode (não remover). */
export { MODELOS };
