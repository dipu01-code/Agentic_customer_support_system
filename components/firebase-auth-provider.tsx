"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
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
      setError(authError instanceof Error ? authError.message : "Google sign-in failed.");
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
