"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthError, User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase";

type Role = "admin" | "customer";

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getFirebaseAuthMessage(authError: unknown) {
  if (typeof window === "undefined") {
    return "Google sign-in failed.";
  }

  const errorCode = (authError as Partial<AuthError> | null)?.code;
  const host = window.location.hostname;

  if (errorCode === "auth/unauthorized-domain") {
    return `Firebase blocked Google sign-in for "${host}". Add this domain in Firebase Console -> Authentication -> Settings -> Authorized domains, then redeploy if you also changed Vercel environment variables.`;
  }

  if (errorCode === "auth/popup-blocked") {
    return "The Google sign-in popup was blocked by the browser. Allow popups for this site and try again.";
  }

  if (errorCode === "auth/popup-closed-by-user") {
    return "Google sign-in was canceled before completion.";
  }

  return authError instanceof Error ? authError.message : "Google sign-in failed.";
}

function resolveRole(email?: string | null): Role | null {
  if (!email) {
    return null;
  }

  return email.toLowerCase().endsWith("@adypu.edu.in") ? "admin" : "customer";
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signInWithGoogle() {
    setError(null);

    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (authError) {
      setError(getFirebaseAuthMessage(authError));
      throw authError;
    }
  }

  async function logOut() {
    setError(null);
    await signOut(firebaseAuth);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: resolveRole(user?.email),
      loading,
      error,
      signInWithGoogle,
      logOut
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useFirebaseAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useFirebaseAuth must be used inside FirebaseAuthProvider.");
  }

  return context;
}
