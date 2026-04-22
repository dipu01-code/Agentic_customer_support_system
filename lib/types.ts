export type TicketStatus = "open" | "escalated" | "waiting_on_customer" | "resolved";
export type TicketCategory = "billing" | "technical" | "general" | "account";
export type TicketUrgency = "low" | "medium" | "high";
export type TicketSentiment = "positive" | "neutral" | "negative";

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
};

export type TicketStats = {
  total: number;
  open: number;
  escalated: number;
  resolved: number;
};
