import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { appConfig } from "@/lib/config";
import type { Ticket, TicketInput, TicketStats, TicketCategory, TicketSentiment, TicketStatus, TicketUrgency } from "@/lib/types";

const dataFile = path.join(process.cwd(), "data", "tickets.json");

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function classifyCategory(text: string): TicketCategory {
  const value = text.toLowerCase();

  if (/(refund|invoice|payment|billing|charge)/.test(value)) return "billing";
  if (/(login|password|error|bug|issue|api|crash|slow)/.test(value)) return "technical";
  if (/(account|profile|subscription|plan|upgrade)/.test(value)) return "account";
  return "general";
}

function detectSentiment(text: string): TicketSentiment {
  const value = text.toLowerCase();

  if (/(angry|frustrated|worst|bad|cancel|unhappy|issue|complaint)/.test(value)) return "negative";
  if (/(great|love|thanks|awesome|helpful)/.test(value)) return "positive";
  return "neutral";
}

function detectUrgency(text: string): TicketUrgency {
  const value = text.toLowerCase();

  if (/(urgent|asap|immediately|critical|blocked|down|outage)/.test(value)) return "high";
  if (/(soon|important|unable|delay)/.test(value)) return "medium";
  return "low";
}

function decideStatus(sentiment: TicketSentiment, urgency: TicketUrgency): TicketStatus {
  if (sentiment === "negative" || urgency === "high") {
    return "escalated";
  }

  return "open";
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]\n", "utf8");
  }
}

async function readTickets(): Promise<Ticket[]> {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, "utf8");
  return JSON.parse(raw) as Ticket[];
}

async function writeTickets(tickets: Ticket[]) {
  await fs.writeFile(dataFile, `${JSON.stringify(tickets, null, 2)}\n`, "utf8");
}

async function notifyN8n(event: string, ticket: Ticket) {
  const targets = [appConfig.n8nWebhookUrl, appConfig.n8nAdminWebhookUrl].filter(Boolean);

  if (targets.length === 0) {
    return;
  }

  await Promise.all(
    targets.map(async (url) => {
      try {
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(appConfig.n8nWebhookSecret ? { "x-webhook-secret": appConfig.n8nWebhookSecret } : {})
          },
          body: JSON.stringify({ event, ticket })
        });
      } catch {
        // Keep the product usable even if the webhook is temporarily down.
      }
    })
  );
}

function validateInput(input: TicketInput) {
  if (!input.customerName || !input.email || !input.subject || !input.message) {
    throw new Error("customerName, email, subject, and message are required.");
  }
}

export async function listTickets() {
  const tickets = await readTickets();
  return tickets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getTicketStats(): Promise<TicketStats> {
  const tickets = await readTickets();

  return {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "open" || ticket.status === "waiting_on_customer").length,
    escalated: tickets.filter((ticket) => ticket.status === "escalated").length,
    resolved: tickets.filter((ticket) => ticket.status === "resolved").length
  };
}

export async function createTicket(input: TicketInput) {
  validateInput(input);

  const subject = normalizeText(input.subject);
  const message = normalizeText(input.message);
  const combinedText = `${subject} ${message}`;
  const category = input.category ?? classifyCategory(combinedText);
  const sentiment = input.sentiment ?? detectSentiment(combinedText);
  const urgency = input.urgency ?? detectUrgency(combinedText);
  const now = new Date().toISOString();

  const ticket: Ticket = {
    id: `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    customerName: normalizeText(input.customerName),
    email: normalizeText(input.email),
    subject,
    message,
    channel: input.channel ?? "web",
    category,
    urgency,
    sentiment,
    status: input.status ?? decideStatus(sentiment, urgency),
    assignedTo: null,
    source: input.source ?? "portal",
    linkedSessionId: input.linkedSessionId ?? null,
    chatSummary: input.chatSummary ?? null,
    createdAt: now,
    updatedAt: now
  };

  const tickets = await readTickets();
  tickets.unshift(ticket);
  await writeTickets(tickets);
  await notifyN8n("ticket.created", ticket);
  revalidatePath("/");
  revalidatePath("/admin");
  return ticket;
}

export async function updateTicketStatus(ticketId: string, status: string, assignedTo: string) {
  const allowedStatuses: TicketStatus[] = ["open", "escalated", "waiting_on_customer", "resolved"];

  if (!allowedStatuses.includes(status as TicketStatus)) {
    throw new Error("Invalid ticket status.");
  }

  const tickets = await readTickets();
  const index = tickets.findIndex((ticket) => ticket.id === ticketId);

  if (index === -1) {
    throw new Error("Ticket not found.");
  }

  const updatedTicket: Ticket = {
    ...tickets[index],
    status: status as TicketStatus,
    assignedTo: assignedTo.trim() || null,
    updatedAt: new Date().toISOString()
  };

  tickets[index] = updatedTicket;
  await writeTickets(tickets);
  await notifyN8n("ticket.updated", updatedTicket);
  revalidatePath("/");
  revalidatePath("/admin");
  return updatedTicket;
}
