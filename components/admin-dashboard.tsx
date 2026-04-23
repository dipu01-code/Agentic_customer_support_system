"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/components/firebase-auth-provider";
import { formatDateTime } from "@/lib/format";
import type { CustomerSummary, Ticket, TicketStats, TicketStatus } from "@/lib/types";

type DashboardProps = {
  customerSummaries: CustomerSummary[];
  initialStats: TicketStats;
  initialTickets: Ticket[];
};

type TicketResponse = {
  tickets: Ticket[];
  stats: TicketStats;
  customerSummaries: CustomerSummary[];
};

type AdminView = "command-center" | "analytics" | "orchestration" | "conversation-log" | "agent-config";

type NavItemProps = {
  onClick?: () => void;
  label: string;
  active?: boolean;
};

function NavItem({ label, active = false, onClick }: NavItemProps) {
  return (
    <button className={`ops-nav-item ${active ? "active" : ""}`} onClick={onClick} type="button">
      <span className="ops-nav-icon" />
      <span>{label}</span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "blue"
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "green" | "amber" | "rose";
}) {
  return (
    <article className={`ops-metric-card ${tone}`}>
      <p className="ops-metric-label">{label}</p>
      <strong className="ops-metric-value">{value}</strong>
      <span className="ops-metric-detail">{detail}</span>
    </article>
  );
}

function MiniTrendChart({ tickets }: { tickets: Ticket[] }) {
  const points = useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const startHour = index * 4;
      const endHour = startHour + 4;
      const score = tickets.filter((ticket) => {
        const hour = new Date(ticket.updatedAt).getHours();
        return hour >= startHour && hour < endHour;
      }).length;

      return score;
    });

    const max = Math.max(...buckets, 1);

    return buckets
      .map((value, index) => {
        const x = 40 + index * 132;
        const y = 230 - (value / max) * 120;
        return `${x},${y}`;
      })
      .join(" ");
  }, [tickets]);

  return (
    <svg className="ops-chart-svg" preserveAspectRatio="none" viewBox="0 0 760 260">
      <defs>
        <linearGradient id="opsTrendFill" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(91, 156, 255, 0.28)" />
          <stop offset="100%" stopColor="rgba(91, 156, 255, 0.02)" />
        </linearGradient>
      </defs>
      <path
        d="M40 230 C120 210, 160 160, 172 164 S280 214, 304 188 S420 94, 436 116 S562 214, 568 184 S672 46, 700 70"
        fill="none"
        opacity="0.12"
        stroke="#3c4e7a"
        strokeWidth="16"
      />
      <polyline fill="none" points={points} stroke="#7aa2ff" strokeLinecap="round" strokeWidth="5" />
      <polygon fill="url(#opsTrendFill)" points={`${points} 700,240 40,240`} />
      <line stroke="rgba(145, 162, 204, 0.18)" x1="28" x2="730" y1="240" y2="240" />
    </svg>
  );
}

export function AdminDashboard({ customerSummaries: initialSummaries, initialStats, initialTickets }: DashboardProps) {
  const router = useRouter();
  const { user, role, loading, logOut } = useFirebaseAuth();
  const [activeView, setActiveView] = useState<AdminView>("command-center");
  const [tickets, setTickets] = useState(initialTickets);
  const [stats, setStats] = useState(initialStats);
  const [customerSummaries, setCustomerSummaries] = useState(initialSummaries);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [configSaved, setConfigSaved] = useState(false);
  const [agentConfig, setAgentConfig] = useState({
    escalationThreshold: "0.80",
    maxAutoReplies: "2",
    fallbackQueue: "Human Escalation Desk",
    tonePolicy: "Professional, calm, and solution-first",
    classifierPrompt: "Classify support requests into billing, technical, account, or general.",
    escalationPrompt: "Escalate when urgency is high, sentiment is negative, or confidence is low."
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/admin/login");
    }

    if (!loading && user && role !== "admin") {
      router.replace("/?error=Only%20@adypu.edu.in%20accounts%20can%20open%20the%20admin%20portal");
    }
  }, [loading, role, router, user]);

  const dashboardMetrics = useMemo(() => {
    const positive = tickets.filter((ticket) => ticket.sentiment === "positive").length;
    const neutral = tickets.filter((ticket) => ticket.sentiment === "neutral").length;
    const negative = tickets.filter((ticket) => ticket.sentiment === "negative").length;
    const total = Math.max(tickets.length, 1);

    const avgResponseMinutes = Math.max(1, Math.round((stats.open + stats.escalated * 1.7 + stats.resolved * 0.8) * 6));
    const resolutionRate = Math.round((stats.resolved / total) * 1000) / 10;
    const sentimentScore = Math.max(0, Math.min(1, (positive * 1 + neutral * 0.6 + negative * 0.2) / total));
    const escalationRate = Math.round((stats.escalated / total) * 1000) / 10;
    const highPriority = tickets.filter((ticket) => ticket.urgency === "high" || ticket.status === "escalated").slice(0, 3);

    return {
      avgResponseMinutes,
      resolutionRate,
      sentimentScore,
      escalationRate,
      positive,
      neutral,
      negative,
      highPriority
    };
  }, [stats, tickets]);

  const orchestrationData = useMemo(() => {
    const intake = tickets.length;
    const faq = tickets.filter((ticket) => ticket.status === "open" || ticket.status === "resolved").length;
    const escalation = tickets.filter((ticket) => ticket.status === "escalated").length;
    const waiting = tickets.filter((ticket) => ticket.status === "waiting_on_customer").length;

    return [
      {
        title: "Intake Classifier",
        detail: `${intake} requests processed`,
        status: "Healthy",
        tone: "blue"
      },
      {
        title: "FAQ Responder",
        detail: `${faq} cases handled automatically`,
        status: "Live",
        tone: "green"
      },
      {
        title: "Escalation Handler",
        detail: `${escalation} cases routed to humans`,
        status: escalation > 0 ? "Attention" : "Stable",
        tone: "amber"
      },
      {
        title: "Customer Follow-up",
        detail: `${waiting} tickets waiting on customer`,
        status: "Pending",
        tone: "rose"
      }
    ];
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return tickets;
    }

    return tickets.filter((ticket) =>
      [ticket.id, ticket.subject, ticket.customerName, ticket.email, ticket.message, ticket.category, ticket.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [searchQuery, tickets]);

  async function refreshTickets() {
    const response = await fetch("/api/tickets", { cache: "no-store" });
    const result = (await response.json()) as TicketResponse;
    setTickets(result.tickets);
    setStats(result.stats);
    setCustomerSummaries(result.customerSummaries);
  }

  async function handleSave(ticketId: string, formData: FormData) {
    const status = String(formData.get("status") ?? "") as TicketStatus;
    const assignedTo = String(formData.get("assignedTo") ?? "");

    if (!user?.email) {
      setError("Sign in again before updating tickets.");
      return;
    }

    setSavingId(ticketId);
    setError(null);

    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status,
        assignedTo,
        adminEmail: user.email
      })
    });

    const result = await response.json();

    if (!response.ok) {
      setSavingId(null);
      setError(result.message ?? "Unable to update ticket.");
      return;
    }

    await refreshTickets();
    setSavingId(null);
  }

  async function handleLogOut() {
    await logOut();
    router.replace("/admin/login");
  }

  function handleConfigChange(key: keyof typeof agentConfig, value: string) {
    setAgentConfig((current) => ({ ...current, [key]: value }));
    setConfigSaved(false);
  }

  function handleConfigSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfigSaved(true);
    setError(null);
  }

  if (loading || !user || role !== "admin") {
    return (
      <main className="page-shell">
        <div className="flash">Loading admin access...</div>
      </main>
    );
  }

  return (
    <main className="ops-shell">
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <span className="ops-brand-kicker">Command Center</span>
          <strong>AI Engine Active</strong>
        </div>

        <nav className="ops-nav">
          <NavItem
            active={activeView === "command-center"}
            label="Command Center"
            onClick={() => setActiveView("command-center")}
          />
          <NavItem active={activeView === "analytics"} label="Analytics" onClick={() => setActiveView("analytics")} />
          <NavItem
            active={activeView === "orchestration"}
            label="Orchestration"
            onClick={() => setActiveView("orchestration")}
          />
          <NavItem
            active={activeView === "conversation-log"}
            label="Conversation Log"
            onClick={() => setActiveView("conversation-log")}
          />
          <NavItem
            active={activeView === "agent-config"}
            label="Agent Config"
            onClick={() => setActiveView("agent-config")}
          />
        </nav>

        <div className="ops-sidebar-footer">
          <NavItem label="Help Center" />
          <NavItem label="Documentation" />
          <div className="ops-admin-badge">
            <div className="ops-admin-avatar">{(user.displayName ?? "A").slice(0, 1)}</div>
            <div>
              <strong>System Admin</strong>
              <span>Online</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="ops-main">
        <header className="ops-topbar">
          <div className="ops-title-row">
            <h1>OMNIAGENT OS</h1>
            <span>{`DASHBOARD / ${activeView.replaceAll("-", " ").toUpperCase()}`}</span>
          </div>
          <div className="ops-topbar-actions">
            <div className="ops-search">Query Engine...</div>
            <button className="ops-icon-button" onClick={handleLogOut} type="button">
              Log out
            </button>
          </div>
        </header>

        {error ? <div className="ops-error-banner">{error}</div> : null}

        {activeView === "command-center" ? (
          <section className="ops-section-stack">
            <section className="ops-metrics-grid">
              <MetricCard
                detail={`${stats.open} active conversations`}
                label="Open Queue"
                tone="blue"
                value={String(stats.open)}
              />
              <MetricCard
                detail="Needs direct operator review"
                label="Escalated Cases"
                tone="rose"
                value={String(stats.escalated)}
              />
              <MetricCard
                detail={`${customerSummaries.length} tracked customers`}
                label="Customer Threads"
                tone="green"
                value={String(customerSummaries.length)}
              />
              <MetricCard
                detail="Closed by bot or human"
                label="Resolved"
                tone="amber"
                value={String(stats.resolved)}
              />
            </section>

            <section className="ops-grid">
              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Priority Dispatch Board</h2>
                    <p>Cases that need the fastest admin action right now.</p>
                  </div>
                </div>
                <div className="ops-alert-list">
                  {dashboardMetrics.highPriority.length === 0 ? (
                    <div className="ops-alert-card">
                      <strong>No immediate escalations</strong>
                      <p>The support system is stable and no urgent dispatch is pending.</p>
                    </div>
                  ) : (
                    dashboardMetrics.highPriority.map((ticket) => (
                      <article className="ops-alert-card" key={ticket.id}>
                        <div className="ops-alert-top">
                          <strong>{ticket.status === "escalated" ? "Human Review Required" : "High Priority"}</strong>
                          <span>{formatDateTime(ticket.updatedAt)}</span>
                        </div>
                        <p>{ticket.subject}</p>
                        <small>
                          {ticket.customerName} · {ticket.email}
                        </small>
                      </article>
                    ))
                  )}
                </div>
              </article>

              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Operator Snapshot</h2>
                    <p>Quick command view for the signed-in admin.</p>
                  </div>
                </div>
                <div className="ops-command-card">
                  <strong>{user.displayName ?? "System Admin"}</strong>
                  <span>{user.email}</span>
                  <div className="ops-summary-meta">
                    <span>{stats.total} total tickets</span>
                    <span>{stats.open + stats.escalated} active workload</span>
                    <span>{dashboardMetrics.resolutionRate}% resolution rate</span>
                  </div>
                </div>
                <div className="ops-routing-list">
                  <div className="ops-routing-row">
                    <span>Next best action</span>
                    <strong>{stats.escalated > 0 ? "Review escalated queue" : "Monitor live chatbot traffic"}</strong>
                  </div>
                  <div className="ops-routing-row">
                    <span>Automation status</span>
                    <strong>{stats.escalated > 2 ? "Escalation pressure rising" : "Stable"}</strong>
                  </div>
                  <div className="ops-routing-row">
                    <span>Admin access</span>
                    <strong>Verified for @{user.email?.split("@")[1] ?? "admin domain"}</strong>
                  </div>
                </div>
              </article>
            </section>

            <section className="ops-bottom-grid">
              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Recent Customer Summaries</h2>
                    <p>Rolling summaries from chatbot and manual escalations.</p>
                  </div>
                </div>
                <div className="ops-summary-list">
                  {customerSummaries.length === 0 ? (
                    <div className="ops-summary-card">
                      <strong>No customer summaries yet</strong>
                      <p>Customer summaries will appear here once users engage with the support bot.</p>
                    </div>
                  ) : (
                    customerSummaries.slice(0, 3).map((summary) => (
                      <article className="ops-summary-card" key={summary.email}>
                        <div className="ops-summary-head">
                          <div>
                            <strong>{summary.customerName}</strong>
                            <span>{summary.email}</span>
                          </div>
                          <label>{summary.latestTicketId ?? "No ticket"}</label>
                        </div>
                        <p>{summary.latestSummary}</p>
                        <div className="ops-summary-meta">
                          <span>{summary.totalSessions} chats</span>
                          <span>{summary.activeTicketCount} active</span>
                          <span>{summary.escalatedTicketCount} escalated</span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </article>

              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Queue Controls</h2>
                    <p>Fast updates for the newest support tickets.</p>
                  </div>
                </div>
                <div className="ops-ticket-stack">
                  {tickets.length === 0 ? (
                    <div className="ops-ticket-card">
                      <strong>No tickets yet</strong>
                      <p>Incoming chatbot escalations and manual tickets will appear here.</p>
                    </div>
                  ) : (
                    tickets.slice(0, 3).map((ticket) => (
                      <article className="ops-ticket-card" key={ticket.id}>
                        <div className="ops-ticket-head">
                          <div>
                            <strong>{ticket.subject}</strong>
                            <p>
                              {ticket.customerName} · {ticket.email}
                            </p>
                          </div>
                          <span className={`ops-status ${ticket.status}`}>{ticket.status.replaceAll("_", " ")}</span>
                        </div>
                        <div className="ops-ticket-meta">
                          <span>{ticket.category}</span>
                          <span>{ticket.urgency}</span>
                          <span>{ticket.sentiment}</span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </article>
            </section>
          </section>
        ) : null}

        {activeView === "analytics" ? (
          <>
            <section className="ops-metrics-grid">
              <MetricCard
                detail="12% faster vs last 24h"
                label="Avg Response Time"
                tone="blue"
                value={`${Math.floor(dashboardMetrics.avgResponseMinutes / 60)}m ${dashboardMetrics.avgResponseMinutes % 60}s`}
              />
              <MetricCard
                detail="2.1% gain vs last 24h"
                label="Resolution Rate"
                tone="green"
                value={`${dashboardMetrics.resolutionRate}%`}
              />
              <MetricCard
                detail={`${dashboardMetrics.positive} positive / ${dashboardMetrics.neutral} neutral`}
                label="Sentiment Score"
                tone="amber"
                value={dashboardMetrics.sentimentScore.toFixed(2)}
              />
              <MetricCard
                detail={`${dashboardMetrics.escalationRate}% critical threshold`}
                label="Escalation Rate"
                tone="rose"
                value={`${dashboardMetrics.escalationRate}%`}
              />
            </section>

            <section className="ops-grid">
              <article className="ops-panel ops-panel-large">
                <div className="ops-panel-header">
                  <div>
                    <h2>Sentiment Trends (24h)</h2>
                    <p>Live flow of customer mood across the current support window.</p>
                  </div>
                  <div className="ops-legend">
                    <span>
                      <i className="blue" />
                      Positive
                    </span>
                    <span>
                      <i className="amber" />
                      Neutral
                    </span>
                    <span>
                      <i className="rose" />
                      Negative
                    </span>
                  </div>
                </div>
                <MiniTrendChart tickets={tickets} />
                <div className="ops-time-labels">
                  <span>00:00</span>
                  <span>04:00</span>
                  <span>08:00</span>
                  <span>12:00</span>
                  <span>16:00</span>
                  <span>20:00</span>
                  <span>23:59</span>
                </div>
              </article>

              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Recent Critical Alerts</h2>
                    <p>Escalations that need direct human action.</p>
                  </div>
                </div>
                <div className="ops-alert-list">
                  {dashboardMetrics.highPriority.length === 0 ? (
                    <div className="ops-alert-card">
                      <strong>No critical alerts</strong>
                      <p>All current conversations are stable.</p>
                    </div>
                  ) : (
                    dashboardMetrics.highPriority.map((ticket) => (
                      <div className="ops-alert-card" key={ticket.id}>
                        <div className="ops-alert-top">
                          <strong>{ticket.status === "escalated" ? "Highly Negative" : "Escalation Trigger"}</strong>
                          <span>{formatDateTime(ticket.updatedAt)}</span>
                        </div>
                        <p>
                          {ticket.id}: {ticket.subject}
                        </p>
                        <small>{ticket.message}</small>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>

            <section className="ops-bottom-grid">
              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Customer Summary Feed</h2>
                    <p>Every chatbot conversation is condensed here for human review.</p>
                  </div>
                </div>
                <div className="ops-summary-list">
                  {customerSummaries.length === 0 ? (
                    <div className="ops-summary-card">
                      <strong>No summaries yet</strong>
                      <p>As users talk with the chatbot, their admin-ready summary cards will appear here.</p>
                    </div>
                  ) : (
                    customerSummaries.slice(0, 4).map((summary) => (
                      <article className="ops-summary-card" key={summary.email}>
                        <div className="ops-summary-head">
                          <div>
                            <strong>{summary.customerName}</strong>
                            <span>{summary.email}</span>
                          </div>
                          <label>{summary.latestTicketId ?? "No ticket"}</label>
                        </div>
                        <p>{summary.latestSummary}</p>
                        <div className="ops-summary-meta">
                          <span>{summary.totalSessions} chats</span>
                          <span>{summary.totalTickets} tickets</span>
                          <span>{summary.escalatedTicketCount} escalated</span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </article>

              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Agent Throughput Comparison</h2>
                    <p>Volume distribution across intake, FAQ, and escalation lanes.</p>
                  </div>
                </div>
                <div className="ops-bars">
                  {[
                    { label: "Mon", value: 54, tone: "blue" },
                    { label: "Tue", value: 68, tone: "blue" },
                    { label: "Wed", value: 60, tone: "blue" },
                    { label: "Thu", value: 82, tone: "green" },
                    { label: "Fri", value: 94, tone: "green" },
                    { label: "Sat", value: 72, tone: "green" },
                    { label: "Sun", value: 42, tone: "amber" }
                  ].map((bar) => (
                    <div className="ops-bar-group" key={bar.label}>
                      <div className={`ops-bar ${bar.tone}`} style={{ height: `${bar.value}%` }} />
                      <span>{bar.label}</span>
                    </div>
                  ))}
                </div>
                <div className="ops-efficiency">
                  <div>
                    <label>Core Efficiency</label>
                    <div className="ops-progress-track">
                      <span style={{ width: `${Math.min(98, stats.resolved * 14 + 30)}%` }} />
                    </div>
                  </div>
                  <div>
                    <label>Bot-to-Human Ratio</label>
                    <div className="ops-progress-track subtle">
                      <span style={{ width: `${Math.min(88, stats.open * 12 + 20)}%` }} />
                    </div>
                  </div>
                </div>
              </article>

              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Conversation Queue</h2>
                    <p>Live ticket control for human agents.</p>
                  </div>
                </div>
                <div className="ops-ticket-stack">
                  {tickets.length === 0 ? (
                    <div className="ops-ticket-card">
                      <strong>No tickets yet</strong>
                      <p>Once the customer portal sends a request, it will appear here.</p>
                    </div>
                  ) : (
                    tickets.slice(0, 6).map((ticket) => (
                      <article className="ops-ticket-card" key={ticket.id}>
                        <div className="ops-ticket-head">
                          <div>
                            <strong>{ticket.subject}</strong>
                            <p>
                              {ticket.customerName} · {ticket.email}
                            </p>
                          </div>
                          <span className={`ops-status ${ticket.status}`}>{ticket.status.replaceAll("_", " ")}</span>
                        </div>

                        <div className="ops-ticket-meta">
                          <span>{ticket.category}</span>
                          <span>{ticket.urgency}</span>
                          <span>{ticket.sentiment}</span>
                        </div>

                        <p className="ops-ticket-message">{ticket.message}</p>
                        {ticket.chatSummary ? <p className="ops-ticket-summary">{ticket.chatSummary}</p> : null}

                        <form
                          className="ops-ticket-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const formData = new FormData(event.currentTarget);
                            void handleSave(ticket.id, formData);
                          }}
                        >
                          <select className="ops-dark-input" defaultValue={ticket.status} name="status">
                            <option value="open">open</option>
                            <option value="escalated">escalated</option>
                            <option value="waiting_on_customer">waiting_on_customer</option>
                            <option value="resolved">resolved</option>
                          </select>
                          <input
                            className="ops-dark-input"
                            defaultValue={ticket.assignedTo ?? ""}
                            name="assignedTo"
                            placeholder="Assign human agent"
                          />
                          <button className="ops-primary-button" disabled={savingId === ticket.id} type="submit">
                            {savingId === ticket.id ? "Saving..." : "Update"}
                          </button>
                        </form>
                      </article>
                    ))
                  )}
                </div>
              </article>
            </section>
          </>
        ) : null}

        {activeView === "orchestration" ? (
          <section className="ops-section-stack">
            <article className="ops-panel">
              <div className="ops-panel-header">
                <div>
                  <h2>Workflow Orchestration</h2>
                  <p>Live status across the specialized agent chain.</p>
                </div>
              </div>
              <div className="ops-stage-grid">
                {orchestrationData.map((stage) => (
                  <div className={`ops-stage-card ${stage.tone}`} key={stage.title}>
                    <strong>{stage.title}</strong>
                    <p>{stage.detail}</p>
                    <span>{stage.status}</span>
                  </div>
                ))}
              </div>
            </article>

            <section className="ops-bottom-grid">
              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Routing Matrix</h2>
                    <p>How the system should route current support load.</p>
                  </div>
                </div>
                <div className="ops-routing-list">
                  <div className="ops-routing-row">
                    <span>Billing + Negative Sentiment</span>
                    <strong>Escalation Handler → Human Agent</strong>
                  </div>
                  <div className="ops-routing-row">
                    <span>Technical + High Urgency</span>
                    <strong>Classifier → FAQ → Escalation</strong>
                  </div>
                  <div className="ops-routing-row">
                    <span>General FAQ</span>
                    <strong>FAQ Responder → Auto Close</strong>
                  </div>
                  <div className="ops-routing-row">
                    <span>Waiting on Customer</span>
                    <strong>Follow-up Queue → Reminder Trigger</strong>
                  </div>
                </div>
              </article>

              <article className="ops-panel">
                <div className="ops-panel-header">
                  <div>
                    <h2>Queue Pressure</h2>
                    <p>Current agent demand by lane.</p>
                  </div>
                </div>
                <div className="ops-pressure-grid">
                  <div>
                    <label>Intake Load</label>
                    <div className="ops-progress-track subtle">
                      <span style={{ width: `${Math.min(100, tickets.length * 12 + 16)}%` }} />
                    </div>
                  </div>
                  <div>
                    <label>FAQ Capacity</label>
                    <div className="ops-progress-track">
                      <span style={{ width: `${Math.min(100, stats.resolved * 16 + 18)}%` }} />
                    </div>
                  </div>
                  <div>
                    <label>Escalation Backlog</label>
                    <div className="ops-progress-track danger">
                      <span style={{ width: `${Math.min(100, stats.escalated * 22 + 10)}%` }} />
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </section>
        ) : null}

        {activeView === "conversation-log" ? (
          <section className="ops-section-stack">
            <article className="ops-panel">
              <div className="ops-panel-header">
                <div>
                  <h2>Conversation Log</h2>
                  <p>Search and inspect all customer conversations.</p>
                </div>
                <input
                  className="ops-dark-input ops-filter-input"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search ticket, customer, status..."
                  value={searchQuery}
                />
              </div>
              <div className="ops-log-table">
                <div className="ops-log-head">
                  <span>Ticket</span>
                  <span>Customer</span>
                  <span>Category</span>
                  <span>Status</span>
                  <span>Updated</span>
                </div>
                {filteredTickets.length === 0 ? (
                  <div className="ops-log-empty">No conversations matched this search.</div>
                ) : (
                  filteredTickets.map((ticket) => (
                    <div className="ops-log-row" key={ticket.id}>
                      <div>
                        <strong>{ticket.subject}</strong>
                        <span>{ticket.id}</span>
                      </div>
                      <div>
                        <strong>{ticket.customerName}</strong>
                        <span>{ticket.email}</span>
                      </div>
                      <div>
                        <strong>{ticket.category}</strong>
                        <span>{ticket.chatSummary ?? ticket.sentiment}</span>
                      </div>
                      <div>
                        <span className={`ops-status ${ticket.status}`}>{ticket.status.replaceAll("_", " ")}</span>
                      </div>
                      <div>
                        <strong>{formatDateTime(ticket.updatedAt)}</strong>
                        <span>{ticket.assignedTo || "Unassigned"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="ops-panel">
              <div className="ops-panel-header">
                <div>
                  <h2>Per-User Summary Section</h2>
                  <p>Admin-facing summaries for every customer across chat and tickets.</p>
                </div>
              </div>
              <div className="ops-summary-list">
                {customerSummaries.length === 0 ? (
                  <div className="ops-summary-card">
                    <strong>No customer history yet</strong>
                    <p>Once a user chats with the bot, their summary and escalation state will appear here.</p>
                  </div>
                ) : (
                  customerSummaries.map((summary) => (
                    <article className="ops-summary-card" key={summary.email}>
                      <div className="ops-summary-head">
                        <div>
                          <strong>{summary.customerName}</strong>
                          <span>{summary.email}</span>
                        </div>
                        <label>{formatDateTime(summary.lastSeenAt)}</label>
                      </div>
                      <p>{summary.latestSummary}</p>
                      <div className="ops-summary-meta">
                        <span>{summary.totalSessions} chats</span>
                        <span>{summary.activeTicketCount} active tickets</span>
                        <span>{summary.escalatedTicketCount} escalations</span>
                        <span>{summary.latestTicketId ?? "No linked ticket yet"}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "agent-config" ? (
          <section className="ops-section-stack">
            <article className="ops-panel">
              <div className="ops-panel-header">
                <div>
                  <h2>Agent Configuration</h2>
                  <p>Fine-tune the behavior of classifier, FAQ, and escalation agents.</p>
                </div>
              </div>
              <form className="ops-config-form" onSubmit={handleConfigSave}>
                <div className="ops-config-grid">
                  <div>
                    <label>Escalation Threshold</label>
                    <input
                      className="ops-dark-input"
                      onChange={(event) => handleConfigChange("escalationThreshold", event.target.value)}
                      value={agentConfig.escalationThreshold}
                    />
                  </div>
                  <div>
                    <label>Max Auto Replies</label>
                    <input
                      className="ops-dark-input"
                      onChange={(event) => handleConfigChange("maxAutoReplies", event.target.value)}
                      value={agentConfig.maxAutoReplies}
                    />
                  </div>
                  <div>
                    <label>Fallback Queue</label>
                    <input
                      className="ops-dark-input"
                      onChange={(event) => handleConfigChange("fallbackQueue", event.target.value)}
                      value={agentConfig.fallbackQueue}
                    />
                  </div>
                  <div>
                    <label>Response Tone Policy</label>
                    <input
                      className="ops-dark-input"
                      onChange={(event) => handleConfigChange("tonePolicy", event.target.value)}
                      value={agentConfig.tonePolicy}
                    />
                  </div>
                </div>

                <div className="ops-config-stack">
                  <div>
                    <label>Classifier Prompt</label>
                    <textarea
                      className="ops-dark-input ops-config-textarea"
                      onChange={(event) => handleConfigChange("classifierPrompt", event.target.value)}
                      value={agentConfig.classifierPrompt}
                    />
                  </div>
                  <div>
                    <label>Escalation Prompt</label>
                    <textarea
                      className="ops-dark-input ops-config-textarea"
                      onChange={(event) => handleConfigChange("escalationPrompt", event.target.value)}
                      value={agentConfig.escalationPrompt}
                    />
                  </div>
                </div>

                <div className="button-row">
                  <button className="ops-primary-button" type="submit">
                    Save Agent Config
                  </button>
                  {configSaved ? <span className="ops-inline-note">Configuration updated for this session.</span> : null}
                </div>
              </form>
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}
