"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/components/firebase-auth-provider";

export function AdminLoginCard() {
  const router = useRouter();
  const { user, role, loading, error, signInWithGoogle, logOut } = useFirebaseAuth();

  useEffect(() => {
    if (!loading && user && role === "admin") {
      router.replace("/admin");
    }

    if (!loading && user && role === "customer") {
      router.replace("/?error=Only%20@adypu.edu.in%20accounts%20can%20open%20the%20admin%20portal");
    }
  }, [loading, role, router, user]);

  async function handleAdminSignIn() {
    try {
      await signInWithGoogle();
    } catch {
      // Error is already stored in context.
    }
  }

  async function handleChangeAccount() {
    await logOut();
  }

  return (
    <section className="ops-login-card">
      <div className="ops-login-copy">
        <span className="ops-login-kicker">Human Agent Access</span>
        <h1>Admin Command Login</h1>
        <p>
          Secure entry for support operators managing escalations, sensitive customer tickets, and live intervention
          workflows.
        </p>

        <div className="ops-login-rules">
          <div>
            <strong>Access Policy</strong>
            <span>Only <strong>@adypu.edu.in</strong> Google accounts are allowed into the admin desk.</span>
          </div>
          <div>
            <strong>Firebase Auth</strong>
            <span>Google sign-in runs through your configured Firebase project.</span>
          </div>
        </div>
      </div>

      <div className="ops-login-panel">
        <div className="ops-login-panel-head">
          <span className="ops-login-dot" />
          <span>OMNIAGENT OS</span>
        </div>

        <div className="ops-login-status">
          <label>Agent Core Status</label>
          <strong>{loading ? "Checking session..." : "Ready for authenticated access"}</strong>
        </div>

        {error ? <div className="ops-error-banner">{error}</div> : null}

        {user && role !== "admin" ? (
          <button className="ops-primary-button" onClick={handleChangeAccount} type="button">
            Use another Google account
          </button>
        ) : (
          <button className="ops-primary-button" onClick={handleAdminSignIn} type="button">
            Continue with Google
          </button>
        )}

        <div className="ops-login-meta">
          <span>Admin role is granted by email domain match.</span>
          <span>Support orchestration remains live after sign-in.</span>
        </div>
      </div>
    </section>
  );
}
