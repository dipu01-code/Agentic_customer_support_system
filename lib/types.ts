export type TicketStatus = "open" | "escalated" | "waiting_on_customer" | "resolved";
export type TicketCategory = "billing" | "technical" | "general" | "account";
export type TicketUrgency = "low" | "medium" | "high";
export type TicketSentiment = "positive" | "neutral" | "negative";
export type ChatRole = "user" | "assistant";
export type ChatResolutionState = "active" | "resolved" | "escalated";

export type Ticket = {
  id: string;
  customerName: string;
  email: string;
  subject: string;
  message: string;
  channel: string;
  category: TicketCategory;
  urgency: TicketUrgency;
  sentiment: TicketSentiment;
  status: TicketStatus;
  assignedTo: string | null;
  source: "portal" | "n8n";
  linkedSessionId?: string | null;
  chatSummary?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketInput = {
  customerName: string;
  email: string;
  subject: string;
  message: string;
  channel?: string;
  source?: "portal" | "n8n";
  linkedSessionId?: string | null;
  chatSummary?: string | null;
};

export type TicketStats = {
  total: number;
  open: number;
  escalated: number;
  resolved: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  customerName: string;
  email: string;
  channel: string;
  status: ChatResolutionState;
  summary: string;
  messages: ChatMessage[];
  escalationReason: string | null;
  escalatedTicketId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatReply = {
  session: ChatSession;
  reply: ChatMessage;
  escalated: boolean;
  ticket: Ticket | null;
};

export type CustomerSummary = {
  email: string;
  customerName: string;
  totalSessions: number;
  totalTickets: number;
  lastSeenAt: string;
  latestSummary: string;
  activeTicketCount: number;
  escalatedTicketCount: number;
  latestTicketId: string | null;
};
