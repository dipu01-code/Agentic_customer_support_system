"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/components/firebase-auth-provider";
import { formatDateTime } from "@/lib/format";
import type { Ticket, TicketStats } from "@/lib/types";

type CustomerTicketStatusPageProps = {
  adminDomain: string;
  initialStats: TicketStats;
  tickets: Ticket[];
};

function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function CustomerTicketStatusPage({
  adminDomain,
  initialStats,
  tickets
}: CustomerTicketStatusPageProps) {
  const router = useRouter();
  const { user, role, loading, signInWithGoogle, logOut } = useFirebaseAuth();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const isAdmin = role === "admin";

  const visibleTickets = useMemo(() => {
    const baseTickets = isAdmin ? tickets : tickets.filter((ticket) => ticket.email.toLowerCase() === user?.email?.toLowerCase());
    const query = search.trim().toLowerCase();

    if (!query) {
      return baseTickets;
    }

    return baseTickets.filter((ticket) =>
      [ticket.id, ticket.subject, ticket.message, ticket.chatSummary, ticket.status, ticket.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [isAdmin, search, tickets, user?.email]);

  const selectedTicket =
    visibleTickets.find((ticket) => ticket.id === selectedTicketId) ?? visibleTickets[0] ?? null;

  const stats = useMemo(() => {
    const scopedTickets = isAdmin ? tickets : tickets.filter((ticket) => ticket.email.toLowerCase() === user?.email?.toLowerCase());

    if (isAdmin) {
      return initialStats;
    }

    return {
      total: scopedTickets.length,
      open: scopedTickets.filter((ticket) => ticket.status === "open" || ticket.status === "waiting_on_customer").length,
      escalated: scopedTickets.filter((ticket) => ticket.status === "escalated").length,
      resolved: scopedTickets.filter((ticket) => ticket.status === "resolved").length
    };
  }, [initialStats, isAdmin, tickets, user?.email]);

  async function handleSignIn() {
    try {
      await signInWithGoogle();
      router.refresh();
    } catch {
      // Visible auth errors are handled by the provider state on the main app surfaces.
    }
  }

  async function handleSignOut() {
    await logOut();
    router.push("/");
    router.refresh();
  }

  function openAdminView(view: "command-center" | "analytics" | "conversation-log" | "orchestration" | "agent-config") {
    router.push(`/admin?view=${view}`);
  }

  return (
    <main className="customer-console-shell">
      <aside className={`customer-console-sidebar ${isAdmin ? "admin-visible" : "user-limited"}`}>
        <div>
          <div className="customer-console-brand">
            <h1>OMNIAGENT OS</h1>
            <span>{isAdmin ? "System Stable" : "Customer Support"}</span>
          </div>

          <div className="customer-console-command">
            <strong>{isAdmin ? "Command Center" : "Support Desk"}</strong>
            <span>{isAdmin ? "AI Engine Active" : "Chat Assistance Active"}</span>
          </div>

          {isAdmin ? (
            <nav className="customer-console-nav">
              <button className="customer-console-nav-item" onClick={() => openAdminView("command-center")} type="button">
                <span className="customer-console-nav-icon" />
                Command Center
              </button>
              <button className="customer-console-nav-item" onClick={() => openAdminView("analytics")} type="button">
                <span className="customer-console-nav-icon" />
                Analytics
              </button>
              <button className="customer-console-nav-item" onClick={() => openAdminView("conversation-log")} type="button">
                <span className="customer-console-nav-icon" />
                Conversation Log
              </button>
              <button className="customer-console-nav-item" onClick={() => openAdminView("orchestration")} type="button">
                <span className="customer-console-nav-icon" />
                Orchestration
              </button>
              <button className="customer-console-nav-item" onClick={() => openAdminView("agent-config")} type="button">
                <span className="customer-console-nav-icon" />
                Agent Config
              </button>
            </nav>
          ) : (
            <nav className="customer-console-nav">
              <button className="customer-console-nav-item" onClick={() => router.push("/")} type="button">
                <span className="customer-console-nav-icon" />
                My Conversations
              </button>
              <button className="customer-console-nav-item" onClick={() => router.push("/")} type="button">
                <span className="customer-console-nav-icon" />
                Open Chat
              </button>
              <button className="customer-console-nav-item active" type="button">
                <span className="customer-console-nav-icon" />
                Ticket Status
              </button>
            </nav>
          )}
        </div>

        <div className="customer-console-footer">
          <button className="customer-console-foot-link" type="button">
            Help Center
          </button>
          <button className="customer-console-foot-link" type="button">
            Documentation
          </button>
          {isAdmin ? (
            <a className="customer-console-admin-link" href="/admin">
              Open admin desk
            </a>
          ) : (
            <span className="customer-console-admin-note">Admin controls are visible only to @{adminDomain} accounts.</span>
          )}
        </div>
      </aside>

      <section className="customer-console-main">
        <header className="customer-console-topbar">
          <div className="customer-console-title-row">
            <strong>OMNIAGENT OS</strong>
            <span>Ticket Status</span>
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

        <section className="ticket-status-shell">
          <section className="ticket-status-hero">
            <article className="ticket-status-card">
              <label>Total Tickets</label>
              <strong>{stats.total}</strong>
              <span>All tracked requests on this account</span>
            </article>
            <article className="ticket-status-card">
              <label>Open</label>
              <strong>{stats.open}</strong>
              <span>Currently active or waiting on a reply</span>
            </article>
            <article className="ticket-status-card">
              <label>Escalated</label>
              <strong>{stats.escalated}</strong>
              <span>Sent to a human specialist</span>
            </article>
            <article className="ticket-status-card">
              <label>Resolved</label>
              <strong>{stats.resolved}</strong>
              <span>Closed successfully</span>
            </article>
          </section>

          {!user && !loading ? (
            <section className="ticket-status-panel">
              <div className="customer-console-signin">
                <strong>Sign in to view your ticket status</strong>
                <p>Your account history, live escalations, and ticket resolutions appear here after Google sign-in.</p>
                <button className="ops-primary-button" onClick={handleSignIn} type="button">
                  Continue with Google
                </button>
              </div>
            </section>
          ) : null}

          {user ? (
            <section className="ticket-status-grid">
              <article className="ticket-status-panel">
                <div className="ticket-status-panel-head">
                  <div>
                    <h2>{isAdmin ? "Admin Ticket Overview" : "My Ticket Timeline"}</h2>
                    <p>{isAdmin ? "Review every tracked case from the customer portal." : "Track updates, escalation state, and recent activity."}</p>
                  </div>
                  <input
                    className="ops-dark-input ticket-status-search"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tickets..."
                    value={search}
                  />
                </div>

                <div className="ticket-status-list">
                  {visibleTickets.length === 0 ? (
                    <div className="ticket-status-empty">No tickets match this account yet.</div>
                  ) : (
                    visibleTickets.map((ticket) => (
                      <button
                        className={`ticket-status-row ${selectedTicket?.id === ticket.id ? "active" : ""}`}
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        type="button"
                      >
                        <div>
                          <strong>{ticket.subject}</strong>
                          <span>{ticket.id}</span>
                        </div>
                        <div>
                          <strong>{formatStatusLabel(ticket.status)}</strong>
                          <span>{formatDateTime(ticket.updatedAt)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </article>

              <article className="ticket-status-panel detail">
                {selectedTicket ? (
                  <>
                    <div className="ticket-status-panel-head">
                      <div>
                        <h2>{selectedTicket.subject}</h2>
                        <p>{selectedTicket.id} · {selectedTicket.category.toUpperCase()} · {formatStatusLabel(selectedTicket.status)}</p>
                      </div>
                    </div>

                    <div className="ticket-status-detail-stack">
                      <div className="ticket-status-detail-card">
                        <label>Latest Summary</label>
                        <p>{selectedTicket.chatSummary ?? selectedTicket.message}</p>
                      </div>
                      <div className="ticket-status-detail-card">
                        <label>Ticket Metadata</label>
                        <div className="ticket-status-meta-grid">
                          <span>Priority</span>
                          <strong>{selectedTicket.urgency.toUpperCase()}</strong>
                          <span>Sentiment</span>
                          <strong>{selectedTicket.sentiment.toUpperCase()}</strong>
                          <span>Assigned To</span>
                          <strong>{selectedTicket.assignedTo ?? "Unassigned"}</strong>
                          <span>Channel</span>
                          <strong>{selectedTicket.channel}</strong>
                        </div>
                      </div>
                      <div className="ticket-status-detail-card">
                        <label>Timeline</label>
                        <div className="ticket-status-timeline">
                          <div>
                            <strong>Created</strong>
                            <span>{formatDateTime(selectedTicket.createdAt)}</span>
                          </div>
                          <div>
                            <strong>Last Updated</strong>
                            <span>{formatDateTime(selectedTicket.updatedAt)}</span>
                          </div>
                          <div>
                            <strong>Status</strong>
                            <span>{formatStatusLabel(selectedTicket.status)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="ticket-status-empty">Select a ticket to inspect its full status.</div>
                )}
              </article>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}
