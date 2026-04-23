"use client";

import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/components/firebase-auth-provider";
import { TicketForm } from "@/components/ticket-form";

type HomeAuthPanelProps = {
  error?: string;
  showForm?: boolean;
};

export function HomeAuthPanel({ error, showForm = false }: HomeAuthPanelProps) {
  const router = useRouter();
  const { user, role, loading, error: authError, signInWithGoogle, logOut } = useFirebaseAuth();

  async function handleSignIn() {
    try {
      await signInWithGoogle();
      router.refresh();
    } catch {
      // The provider already stores a readable error.
    }
  }

  async function handleSignOut() {
    await logOut();
    router.refresh();
  }

  return (
    <>
      {error ? <div className="flash">{error}</div> : null}
      {authError ? <div className="flash">{authError}</div> : null}
      {loading ? (
        <div className="ticket-item">
          <strong>Checking sign-in</strong>
          <p className="muted small">Loading your Firebase session.</p>
        </div>
      ) : user ? (
        <>
          <div className="ticket-item">
            <strong>{user.displayName ?? "Signed in user"}</strong>
            <p className="muted small">
              {user.email} · {role}
            </p>
          </div>
          <div className="button-row">
            {role === "admin" ? (
              <a className="button-secondary" href="/admin">
                Open Admin Desk
              </a>
            ) : null}
            <button className="button-secondary" onClick={handleSignOut} type="button">
              Sign out
            </button>
          </div>
          {showForm ? (
            <TicketForm userEmail={user.email ?? ""} userName={user.displayName ?? "Signed-in user"} />
          ) : null}
        </>
      ) : (
        <>
          <div className="button-row">
            <button className="button" onClick={handleSignIn} type="button">
              Continue with Google
            </button>
            <a className="button-secondary" href="/admin/login">
              Admin Sign In
            </a>
          </div>
          <div className="ticket-item">
            <strong>Google sign-in required</strong>
            <p className="muted small">
              Customers and admins both sign in with Firebase Google auth. Admin access is granted only to
              {" "}@adypu.edu.in accounts.
            </p>
          </div>
        </>
      )}
    </>
  );
}
