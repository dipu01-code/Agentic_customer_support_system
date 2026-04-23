"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/components/firebase-auth-provider";
import { ChatSupportPanel } from "@/components/chat-support-panel";
import { TicketForm } from "@/components/ticket-form";
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

function safeUpper(value?: string | null, fallback = "GENERAL") {
  return value ? value.toUpperCase() : fallback;
}

function safeStatusLabel(value?: string | null, fallback = "open") {
  return (value ?? fallback).replaceAll("_", " ");
}

export function CustomerConsole({ adminDomain, error, stats, tickets }: CustomerConsoleProps) {
  const router = useRouter();
  const { user, role, loading, error: authError, signInWithGoogle, logOut } = useFirebaseAuth();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(tickets[0]?.id ?? null);
  const [filter, setFilter] = useState("");
  const chatEntryRef = useRef<HTMLElement | null>(null);
  const isAdmin = role === "admin";

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
  const resolvedRate = tickets.length ? Math.round((stats.resolved / tickets.length) * 100) : 0;
  const confidenceScore = selectedTicket
    ? selectedTicket.status === "escalated"
      ? "68.20%"
      : selectedTicket.urgency === "high"
        ? "82.40%"
        : "96.80%"
    : "94.00%";

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

  function jumpToChat() {
    chatEntryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
              <button className="customer-console-nav-item active" onClick={() => openAdminView("conversation-log")} type="button">
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
              <button className="customer-console-nav-item active" onClick={() => router.push("/")} type="button">
                <span className="customer-console-nav-icon" />
                My Conversations
              </button>
              <button className="customer-console-nav-item" onClick={jumpToChat} type="button">
                <span className="customer-console-nav-icon" />
                Open Chat
              </button>
              <button className="customer-console-nav-item" onClick={() => router.push("/ticket-status")} type="button">
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
            <span>Active Orchestration</span>
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
                  placeholder="Search conversations..."
                  value={filter}
                />
              </div>
            </div>

            <div className="customer-console-ticket-list">
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
                    <div className="customer-console-row-meta">
                      <strong>#{ticket.id.replace("TKT-", "AI-")}</strong>
                      <span>{formatShortTime(ticket.updatedAt)}</span>
                    </div>
                    <div className="customer-console-row-main">
                      <strong>{ticket.subject}</strong>
                      <span>{ticket.chatSummary ?? ticket.message}</span>
                    </div>
                    <div className="customer-console-agent">
                      <span className={`customer-console-intent-pill ${ticket.urgency}`}>
                        {ticket.urgency === "high" ? "High Intent" : safeStatusLabel(ticket.status)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <section className="customer-console-conversation-pane" ref={chatEntryRef}>
            {selectedTicket ? (
              <>
                <div className="customer-console-conversation-top">
                  <div className="customer-console-conversation-title">
                    <strong>{selectedTicket.id.replace("TKT", "Ticket #AI-")}</strong>
                    <span>{selectedTicket.subject}</span>
                  </div>
                  <div className="customer-console-conversation-top-actions">
                    <button className="customer-console-ghost-button" type="button">
                      History
                    </button>
                    <button className="customer-console-danger-button" type="button">
                      Close Ticket
                    </button>
                  </div>
                </div>

                <div className="customer-console-conversation-subhead">
                  <span>
                    Assigned to: <strong>{selectedTicket.status === "escalated" ? "Human Agent" : "OmniBot 4.0"}</strong>
                  </span>
                  <span>
                    Last update: <strong>{formatShortTime(selectedTicket.updatedAt)}</strong>
                  </span>
                </div>

                {loading ? (
                  <div className="ops-error-banner">Checking Firebase session...</div>
                ) : user ? (
                  <>
                    <div className="customer-console-user">
                      <strong>{user.displayName ?? "Signed in user"}</strong>
                      <span>{user.email}</span>
                    </div>
                    <ChatSupportPanel
                      selectedTicket={selectedTicket}
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
                    <strong>Sign in to start live support</strong>
                    <p>Use Firebase Google login to chat with OmniBot and keep every escalation linked to your account.</p>
                    <button className="ops-primary-button" onClick={handleSignIn} type="button">
                      Continue with Google
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="customer-console-empty">No ticket selected yet.</div>
            )}
          </section>

          <aside className="customer-console-insight-pane">
            <div className="customer-console-insight-card">
              <label>Sentiment Analysis</label>
              <strong>Trajectory +{Math.max(12, resolvedRate)}% Improved</strong>
              <div className="customer-console-chart-bars">
                {[38, 30, 44, 58, 72, 86].map((height, index) => (
                  <span key={height} style={{ height: `${height}%`, opacity: index === 5 ? 1 : 0.5 + index * 0.08 }} />
                ))}
              </div>
              <div className="customer-console-chart-labels">
                <span>Session Start</span>
                <span>Now</span>
              </div>
            </div>

            <div className="customer-console-insight-card">
              <label>Intelligence Metadata</label>
              <div className="customer-console-meta-grid">
                <span>Intent</span>
                <strong>{safeUpper(selectedTicket?.category)}</strong>
                <span>Confidence</span>
                <strong>{confidenceScore}</strong>
                <span>Auth Status</span>
                <strong>{user ? "Verified" : "Pending Sign-in"}</strong>
                <span>SLA Timer</span>
                <strong>{selectedTicket?.status === "escalated" ? "01:45 remaining" : "Within target"}</strong>
              </div>
            </div>

            <div className="customer-console-insight-card">
              <label>Logic Engine Logs</label>
              <div className="customer-console-log-box">
                <span>[{selectedTicket ? formatShortTime(selectedTicket.updatedAt) : "00:00:00"}] Fetching session context...</span>
                <span>[{selectedTicket ? formatShortTime(selectedTicket.createdAt) : "00:00:04"}] Intent classified as {selectedTicket?.category ?? "general"}.</span>
                <span>[{selectedTicket ? formatShortTime(selectedTicket.updatedAt) : "00:00:08"}] Sentiment marked {selectedTicket?.sentiment ?? "neutral"}.</span>
                <span>
                  [{selectedTicket ? formatShortTime(selectedTicket.updatedAt) : "00:00:12"}]{" "}
                  {selectedTicket?.status === "escalated" ? "Escalation path armed." : "Automation stable."}
                </span>
              </div>
            </div>

            <button className="customer-console-force-button" type="button">
              Force Human Takeover
            </button>
          </aside>
        </section>

        <footer className="customer-console-statusbar">
          <span>Cloud Status: Operational</span>
          <span>API Latency: 24ms</span>
          <span>{stats.total} total tracked tickets</span>
        </footer>

        <button
          aria-label="Open support chat"
          className="customer-console-chat-fab"
          onClick={jumpToChat}
          type="button"
        >
          <span className="customer-console-chat-fab-icon" />
          <span>Chat Support</span>
        </button>
      </section>
    </main>
  );
}
