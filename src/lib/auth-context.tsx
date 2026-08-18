"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
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
import {
  auth,
  db,
  ensureAuthPersistence,
  IS_FIREBASE_CONFIGURED,
} from "./firebase";
import { resolveInitialProfileName } from "./auth/profile-bootstrap";
import { MODELOS } from "./modelos";
import type { AppUser, PerfilUsuario } from "./types";

type AuthState = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (nome: string, email: string, password: string) => Promise<Pick<AppUser, "uid" | "email">>;
  signOut: () => Promise<void>;
  updateProfileData: (data: Partial<Pick<PerfilUsuario, "nome" | "telefone">>) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthState | null>(null);
const DEMO_USER_KEY = "docfacil:demo-user";

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

function firebaseErrorCode(error: unknown): string {
  return (error as { code?: string })?.code || "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    if (!IS_FIREBASE_CONFIGURED) return loadDemoUser();
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => IS_FIREBASE_CONFIGURED);
  const [error, setError] = useState<string | null>(null);
  const pendingSignupNameRef = useRef<string | null>(null);

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

      const pendingSignupName = pendingSignupNameRef.current;
      let perfil: PerfilUsuario | null = null;

      if (db) {
        try {
          const ref = doc(db, "users", fbUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            perfil = snap.data() as PerfilUsuario;
          } else {
            const novoPerfil: PerfilUsuario = {
              uid: fbUser.uid,
              nome: resolveInitialProfileName({
                pendingSignupName,
                firebaseDisplayName: fbUser.displayName,
              }),
              email: fbUser.email || "",
              plano: "gratis",
              criadoEm: Date.now(),
              atualizadoEm: Date.now(),
            };
            if (fbUser.photoURL) novoPerfil.fotoUrl = fbUser.photoURL;
            await setDoc(ref, novoPerfil);
            perfil = novoPerfil;
          }
        } catch (err) {
          console.warn("[AuthContext] Não foi possível sincronizar perfil do Firestore:", err);
        }
      }

      if (cancelled) return;
      setUser({
        uid: fbUser.uid,
        nome: perfil?.nome || resolveInitialProfileName({
          pendingSignupName,
          firebaseDisplayName: fbUser.displayName,
        }),
        email: fbUser.email || "",
        fotoUrl: perfil?.fotoUrl || fbUser.photoURL || undefined,
        plano: perfil?.plano || "gratis",
      });
      pendingSignupNameRef.current = null;
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
      await ensureAuthPersistence();
      await signInWithPopup(auth, new GoogleAuthProvider());
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
      await ensureAuthPersistence();
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
      return { uid: demo.uid, email: demo.email };
    }

    const normalizedName = nome.trim();
    pendingSignupNameRef.current = normalizedName;

    try {
      await ensureAuthPersistence();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: normalizedName });
      return { uid: cred.user.uid, email: cred.user.email || email };
    } catch (e) {
      pendingSignupNameRef.current = null;
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

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfileData,
        clearError,
      }}
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

/** Traduz mensagens de erro do Firebase Auth para PT-BR claro e orientador. */
export function translateAuthError(e: unknown): string {
  const code = firebaseErrorCode(e);
  const invalidCredentials = "E-mail ou senha incorretos. Verifique a digitação ou entre com o Google.";
  const map: Record<string, string> = {
    "auth/invalid-credential": invalidCredentials,
    "auth/user-not-found": invalidCredentials,
    "auth/wrong-password": invalidCredentials,
    "auth/invalid-email": "E-mail com formato inválido. Verifique se digitou corretamente.",
    "auth/missing-password": "Por favor, digite sua senha.",
    "auth/missing-email": "Por favor, informe seu e-mail.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado. Tente entrar em vez de criar uma nova conta.",
    "auth/weak-password": "A senha não atende aos requisitos de segurança configurados.",
    "auth/password-does-not-meet-requirements": "A senha não atende aos requisitos de segurança configurados.",
    "auth/account-exists-with-different-credential": "Esta conta foi cadastrada com outro método (ex: Google). Use o botão correspondente.",
    "auth/credential-already-in-use": "Esta credencial já está associada a outra conta.",
    "auth/user-disabled": "Esta conta foi temporariamente desativada pelo suporte.",
    "auth/too-many-requests": "Muitas tentativas sem sucesso. Por segurança, aguarde alguns instantes antes de tentar novamente.",
    "auth/popup-closed-by-user": "Login com o Google cancelado (a janela foi fechada antes de concluir).",
    "auth/popup-blocked": "A janela de login com o Google foi bloqueada pelo navegador. Permita pop-ups para continuar.",
    "auth/cancelled-popup-request": "Operação de login cancelada.",
    "auth/network-request-failed": "Sem conexão com a internet. Verifique sua rede e tente novamente.",
    "auth/operation-not-allowed": "Este método de login não está ativado no momento.",
    "auth/internal-error": "Ocorreu uma instabilidade no serviço de autenticação. Tente novamente em instantes.",
  };
  return map[code] || "Não foi possível concluir o login. Verifique seus dados e tente novamente.";
}

export { MODELOS };
