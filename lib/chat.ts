import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { appConfig } from "@/lib/config";
import { createTicket, listTickets } from "@/lib/tickets";
import type { ChatMessage, ChatReply, ChatSession, CustomerSummary, Ticket } from "@/lib/types";

const chatDataFile = path.join(process.cwd(), "data", "chat-sessions.json");

type ChatRequest = {
  customerName: string;
  email: string;
  message: string;
  channel?: string;
  sessionId?: string;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

async function ensureChatDataFile() {
  await fs.mkdir(path.dirname(chatDataFile), { recursive: true });

  try {
    await fs.access(chatDataFile);
  } catch {
    await fs.writeFile(chatDataFile, "[]\n", "utf8");
  }
}

async function readChatSessions(): Promise<ChatSession[]> {
  await ensureChatDataFile();
  const raw = await fs.readFile(chatDataFile, "utf8");
  return JSON.parse(raw) as ChatSession[];
}

async function writeChatSessions(sessions: ChatSession[]) {
  await fs.writeFile(chatDataFile, `${JSON.stringify(sessions, null, 2)}\n`, "utf8");
}

function buildSummary(messages: ChatMessage[]) {
  const userMessages = messages.filter((message) => message.role === "user").map((message) => message.content);
  const assistantMessages = messages.filter((message) => message.role === "assistant").map((message) => message.content);

  if (userMessages.length === 0) {
    return "Customer started a chat but has not asked a question yet.";
  }

  const latestUserIssue = userMessages.at(-1) ?? userMessages[0];
  const firstUserIssue = userMessages[0];
  const latestAssistantReply = assistantMessages.at(-1);

  return [
    `Customer asked about: ${firstUserIssue}.`,
    userMessages.length > 1 ? `Latest concern: ${latestUserIssue}.` : null,
    latestAssistantReply ? `Latest bot response: ${latestAssistantReply}.` : null
  ]
    .filter(Boolean)
    .join(" ");
}

function shouldEscalate(message: string, turnCount: number) {
  const value = message.toLowerCase();

  if (/(human|agent|representative|call me|not solved|still not working|still broken|speak to a person)/.test(value)) {
    return { escalate: true, reason: "Customer requested a human agent after the issue remained unresolved." };
  }

  if (/(urgent|asap|critical|blocked|payment failed|can'?t login|unable to access|outage)/.test(value)) {
    return { escalate: true, reason: "High-risk or urgent customer issue detected in the chat." };
  }

  if (turnCount >= 4) {
    return { escalate: true, reason: "Bot conversation exceeded the auto-resolution threshold without closing the issue." };
  }

  return { escalate: false, reason: null };
}

function fallbackAssistantReply(message: string, escalated: boolean) {
  if (escalated) {
    return "I could not fully solve this in chat, so I have created a support ticket and forwarded your case to a human agent.";
  }

  const value = message.toLowerCase();

  if (/(price|billing|refund|invoice|payment)/.test(value)) {
    return "I can help with billing questions. Please share the order, invoice, or payment context, and I will summarize it for the support team if we need escalation.";
  }

  if (/(login|password|account|access)/.test(value)) {
    return "Let us check access first. Confirm the email you are using, what error you see, and whether this issue happens on every device or only one.";
  }

  if (/(bug|error|api|crash|slow|technical)/.test(value)) {
    return "Please share what you expected, what happened instead, and any exact error text. I will keep the summary updated for the admin team.";
  }

  return "I am here to help. Tell me what happened, what you expected, and whether this is urgent, and I will guide you or escalate if needed.";
}

async function requestN8nReply(payload: {
  session: ChatSession;
  latestMessage: string;
  shouldEscalate: boolean;
}) {
  if (!appConfig.n8nChatWebhookUrl) {
    return null;
  }

  try {
    const response = await fetch(appConfig.n8nChatWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(appConfig.n8nWebhookSecret ? { "x-webhook-secret": appConfig.n8nWebhookSecret } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { reply?: string };
    return typeof result.reply === "string" && result.reply.trim() ? result.reply.trim() : null;
  } catch {
    return null;
  }
}

function createMessage(role: "user" | "assistant", content: string): ChatMessage {
  return {
    id: `MSG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    role,
    content,
    createdAt: new Date().toISOString()
  };
}

export async function listChatSessions() {
  const sessions = await readChatSessions();
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getCustomerSummaries(): Promise<CustomerSummary[]> {
  const [sessions, tickets] = await Promise.all([listChatSessions(), listTickets()]);
  const map = new Map<string, CustomerSummary>();

  sessions.forEach((session) => {
    const current = map.get(session.email);

    if (!current) {
      map.set(session.email, {
        email: session.email,
        customerName: session.customerName,
        totalSessions: 1,
        totalTickets: 0,
        lastSeenAt: session.updatedAt,
        latestSummary: session.summary,
        activeTicketCount: 0,
        escalatedTicketCount: 0,
        latestTicketId: session.escalatedTicketId
      });
      return;
    }

    current.totalSessions += 1;

    if (session.updatedAt > current.lastSeenAt) {
      current.lastSeenAt = session.updatedAt;
      current.latestSummary = session.summary;
      current.latestTicketId = session.escalatedTicketId ?? current.latestTicketId;
      current.customerName = session.customerName;
    }
  });

  tickets.forEach((ticket) => {
    const current = map.get(ticket.email);

    if (!current) {
      map.set(ticket.email, {
        email: ticket.email,
        customerName: ticket.customerName,
        totalSessions: 0,
        totalTickets: 1,
        lastSeenAt: ticket.updatedAt,
        latestSummary: ticket.chatSummary ?? ticket.message,
        activeTicketCount: ticket.status === "resolved" ? 0 : 1,
        escalatedTicketCount: ticket.status === "escalated" ? 1 : 0,
        latestTicketId: ticket.id
      });
      return;
    }

    current.totalTickets += 1;
    if (ticket.status !== "resolved") {
      current.activeTicketCount += 1;
    }
    if (ticket.status === "escalated") {
      current.escalatedTicketCount += 1;
    }
    if (ticket.updatedAt > current.lastSeenAt) {
      current.lastSeenAt = ticket.updatedAt;
      current.latestSummary = ticket.chatSummary ?? ticket.message;
      current.latestTicketId = ticket.id;
      current.customerName = ticket.customerName;
    }
  });

  return Array.from(map.values()).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function sendChatMessage(input: ChatRequest): Promise<ChatReply> {
  const customerName = normalizeText(input.customerName);
  const email = normalizeText(input.email).toLowerCase();
  const message = normalizeText(input.message);

  if (!customerName || !email || !message) {
    throw new Error("customerName, email, and message are required.");
  }

  const sessions = await readChatSessions();
  const sessionIndex = input.sessionId ? sessions.findIndex((session) => session.id === input.sessionId) : -1;
  const now = new Date().toISOString();

  const session: ChatSession =
    sessionIndex >= 0
      ? { ...sessions[sessionIndex] }
      : {
          id: `CHT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          customerName,
          email,
          channel: input.channel ?? "web-chat",
          status: "active",
          summary: "",
          messages: [],
          escalationReason: null,
          escalatedTicketId: null,
          createdAt: now,
          updatedAt: now
        };

  session.customerName = customerName;
  session.email = email;
  session.updatedAt = now;

  const userMessage = createMessage("user", message);
  session.messages = [...session.messages, userMessage];

  const escalationDecision = shouldEscalate(message, session.messages.filter((entry) => entry.role === "user").length);
  const n8nReply = await requestN8nReply({
    session,
    latestMessage: message,
    shouldEscalate: escalationDecision.escalate
  });
  const assistantMessage = createMessage(
    "assistant",
    n8nReply ?? fallbackAssistantReply(message, escalationDecision.escalate)
  );

  session.messages = [...session.messages, assistantMessage];
  session.summary = buildSummary(session.messages);

  let createdTicket: Ticket | null = null;

  if (escalationDecision.escalate) {
    session.status = "escalated";
    session.escalationReason = escalationDecision.reason;

    if (!session.escalatedTicketId) {
      createdTicket = await createTicket({
        customerName,
        email,
        subject: `Chat escalation: ${message.slice(0, 72)}`,
        message,
        channel: input.channel ?? "web-chat",
        source: "portal",
        linkedSessionId: session.id,
        chatSummary: session.summary
      });
      session.escalatedTicketId = createdTicket.id;
    }
  } else {
    session.status = "active";
  }

  if (sessionIndex >= 0) {
    sessions[sessionIndex] = session;
  } else {
    sessions.unshift(session);
  }

  await writeChatSessions(sessions);
  revalidatePath("/");
  revalidatePath("/admin");

  return {
    session,
    reply: assistantMessage,
    escalated: escalationDecision.escalate,
    ticket: createdTicket
  };
}
