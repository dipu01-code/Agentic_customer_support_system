"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/components/firebase-auth-provider";
import { ChatSupportPanel } from "@/components/chat-support-panel";
import { TicketForm } from "@/components/ticket-form";
import { formatDateTime } from "@/lib/format";
import type { Ticket, TicketStats } from "@/lib/types";

type CustomerConsoleProps = {
  adminDomain: string;
  error?: string;
  stats: TicketStats;
  tickets: Ticket[];
};

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function CustomerConsole({ adminDomain, error, stats, tickets }: CustomerConsoleProps) {
  const router = useRouter();
  const { user, role, loading, error: authError, signInWithGoogle, logOut } = useFirebaseAuth();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(tickets[0]?.id ?? null);
  const [filter, setFilter] = useState("");

  const filteredTickets = useMemo(() => {
    const query = filter.trim().toLowerCase();

    if (!query) {
      return tickets;
    }

    return tickets.filter((ticket) =>
      [ticket.subject, ticket.message, ticket.customerName, ticket.email, ticket.id, ticket.category, ticket.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [filter, tickets]);

  const selectedTicket =
    filteredTickets.find((ticket) => ticket.id === selectedTicketId) ?? filteredTickets[0] ?? tickets[0] ?? null;

  async function handleSignIn() {
    try {
      await signInWithGoogle();
      router.refresh();
    } catch {
      // Provider already stores the visible error.
    }
  }

  async function handleSignOut() {
    await logOut();
    router.refresh();
  }

  return (
    <main className="customer-console-shell">
      <aside className="customer-console-sidebar">
        <div>
          <div className="customer-console-brand">
            <h1>OMNIAGENT OS</h1>
            <span>System Stable</span>
          </div>

          <div className="customer-console-command">
            <strong>Command Center</strong>
            <span>AI Engine Active</span>
          </div>

          <nav className="customer-console-nav">
            <button className="customer-console-nav-item" type="button">
              <span className="customer-console-nav-icon" />
              Analytics
            </button>
            <button className="customer-console-nav-item" type="button">
              <span className="customer-console-nav-icon" />
              Orchestration
            </button>
            <button className="customer-console-nav-item active" type="button">
              <span className="customer-console-nav-icon" />
              Conversation Log
            </button>
            <button className="customer-console-nav-item" type="button">
              <span className="customer-console-nav-icon" />
              Agent Config
            </button>
          </nav>
        </div>

        <div className="customer-console-footer">
          <button className="customer-console-foot-link" type="button">
            Help Center
          </button>
          <button className="customer-console-foot-link" type="button">
            Documentation
          </button>
          <a className="customer-console-admin-link" href="/admin/login">
            Admin portal for @{adminDomain}
          </a>
        </div>
      </aside>

      <section className="customer-console-main">
        <header className="customer-console-topbar">
          <div className="customer-console-title-row">
            <strong>OMNIAGENT OS</strong>
            <span>System Stable</span>
          </div>

          <div className="customer-console-toolbar-icons">
            <span className="customer-console-top-icon" />
            <span className="customer-console-top-icon" />
            <span className="customer-console-top-icon" />
            {user ? (
              <button className="ops-icon-button" onClick={handleSignOut} type="button">
                Sign out
              </button>
            ) : (
              <button className="ops-primary-button" onClick={handleSignIn} type="button">
                Google Sign In
              </button>
            )}
          </div>
        </header>

        {error ? <div className="ops-error-banner">{error}</div> : null}
        {authError ? <div className="ops-error-banner">{authError}</div> : null}

        <section className="customer-console-layout">
          <div className="customer-console-center">
            <div className="customer-console-filters">
              <div className="customer-console-search"> 
                <input
                  className="customer-console-search-input"
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Filter interactions..."
                  value={filter}
                />
              </div>
              <button className="customer-console-chip" type="button">
                Agent
              </button>
              <button className="customer-console-chip" type="button">
                Sentiment
              </button>
              <button className="customer-console-chip" type="button">
                Last 24h
              </button>
            </div>

            <div className="customer-console-table">
              <div className="customer-console-table-head">
                <span>Timestamp</span>
                <span>Query Summary</span>
                <span>Primary Agent</span>
              </div>

              {filteredTickets.length === 0 ? (
                <div className="customer-console-empty">No matching conversations found.</div>
              ) : (
                filteredTickets.map((ticket) => (
                  <button
                    className={`customer-console-row ${selectedTicket?.id === ticket.id ? "active" : ""}`}
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    type="button"
                  >
                    <div>
                      <strong>{formatShortTime(ticket.updatedAt)}</strong>
                    </div>
                    <div>
                      <strong>{ticket.subject}</strong>
                      <span>{ticket.message}</span>
                    </div>
                    <div className="customer-console-agent">
                      <span className={`customer-console-agent-dot ${ticket.status}`} />
                      <strong>{ticket.status === "escalated" ? "AGENT-X7" : "SUPPORT-03"}</strong>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <aside className="customer-console-detail">
            {selectedTicket ? (
              <>
                <div className="customer-console-detail-head">
                  <div>
                    <strong>{selectedTicket.id.replace("TKT", "Ticket #AI")}</strong>
                    <span>Subject: {selectedTicket.subject}</span>
                  </div>
                  <button className="customer-console-close" type="button">
                    ×
                  </button>
                </div>

                <div className="customer-console-tags">
                  <span>{selectedTicket.category.toUpperCase()}</span>
                  <span>{selectedTicket.urgency.toUpperCase()}</span>
                  <span>{selectedTicket.sentiment.toUpperCase()}</span>
                </div>

                <div className="customer-console-thread">
                  <div className="customer-console-msg user">
                    <label>User (external)</label>
                    <span>{formatShortTime(selectedTicket.createdAt)}</span>
                    <p>{selectedTicket.message}</p>
                  </div>

                  <div className="customer-console-msg agent">
                    <label>Agent-X7</label>
                    <span>{formatShortTime(selectedTicket.updatedAt)}</span>
                    <p>
                      Your request has been analyzed. Current status is <strong>{selectedTicket.status}</strong> and
                      the system has routed it through the {selectedTicket.category} support lane.
                    </p>
                  </div>

                  <div className="customer-console-system-note">
                    <label>System Note</label>
                    <span>{formatDateTime(selectedTicket.updatedAt)}</span>
                    <p>
                      Sentiment marked as {selectedTicket.sentiment}. Escalation policy will trigger automatically if
                      urgency increases or the issue remains unresolved.
                    </p>
                  </div>
                </div>

                <div className="customer-console-actions">
                  {loading ? (
                    <div className="ops-error-banner">Checking Firebase session...</div>
                  ) : user ? (
                    <>
                      <div className="customer-console-user">
                        <strong>{user.displayName ?? "Signed in user"}</strong>
                        <span>{user.email}</span>
                      </div>
                      <ChatSupportPanel
                        userEmail={user.email ?? ""}
                        userName={user.displayName ?? "Signed-in user"}
                      />
                      <TicketForm userEmail={user.email ?? ""} userName={user.displayName ?? "Signed-in user"} />
                      {role === "admin" ? (
                        <a className="ops-primary-button" href="/admin">
                          Open Admin Desk
                        </a>
                      ) : null}
                    </>
                  ) : (
                    <div className="customer-console-signin">
                      <strong>Sign in to send response</strong>
                      <p>Use Firebase Google login to submit a support request and stay synced with the thread.</p>
                      <button className="ops-primary-button" onClick={handleSignIn} type="button">
                        Continue with Google
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="customer-console-empty">No ticket selected yet.</div>
            )}
          </aside>
        </section>

        <footer className="customer-console-statusbar">
          <span>Cloud Status: Operational</span>
          <span>API Latency: 24ms</span>
          <span>{stats.total} total tracked tickets</span>
        </footer>
      </section>
    </main>
  );
}
