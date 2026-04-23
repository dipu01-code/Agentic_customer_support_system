"use client";

import { useState, useTransition } from "react";
import { formatDateTime } from "@/lib/format";
import type { ChatMessage, ChatSession, Ticket } from "@/lib/types";

type ChatSupportPanelProps = {
  userName: string;
  userEmail: string;
  selectedTicket?: Ticket | null;
};

type ChatResponse = {
  ok: boolean;
  session: ChatSession;
  reply: ChatMessage;
  escalated: boolean;
  ticket: Ticket | null;
  message?: string;
};

function createSyntheticMessage(id: string, role: "user" | "assistant", content: string, createdAt: string): ChatMessage {
  return {
    id,
    role,
    content,
    createdAt
  };
}

export function ChatSupportPanel({ userName, userEmail, selectedTicket = null }: ChatSupportPanelProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const transcript = session?.messages.length
    ? session.messages
    : selectedTicket
      ? [
          createSyntheticMessage(
            `seed-user-${selectedTicket.id}`,
            "user",
            selectedTicket.message,
            selectedTicket.createdAt
          ),
          createSyntheticMessage(
            `seed-agent-${selectedTicket.id}`,
            "assistant",
            `I have reviewed ticket ${selectedTicket.id}. Current lane: ${selectedTicket.category}. Status: ${selectedTicket.status}. ${
              selectedTicket.chatSummary ??
              "I can continue helping here, or escalate this case to a human agent if the issue is still unresolved."
            }`,
            selectedTicket.updatedAt
          )
        ]
      : [];

  async function submitMessage(message: string) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerName: userName,
          email: userEmail,
          message: trimmedMessage,
          sessionId: session?.id
        })
      });

      const result = (await response.json()) as ChatResponse;

      if (!response.ok || !result.ok) {
        setFeedback(result.message ?? "Unable to send chat message.");
        return;
      }

      setSession(result.session);
      setDraft("");
      setFeedback(
        result.escalated && result.ticket
          ? `Escalated to human agent. Ticket created: ${result.ticket.id}`
          : "Bot response added to the conversation summary."
      );
    });
  }

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(draft);
  }

  function useQuickAction(action: "diagnostic" | "faq" | "human") {
    if (action === "diagnostic") {
      const detail = selectedTicket?.subject ?? "my issue";
      void submitMessage(`Run a diagnostic for ${detail} and tell me the most likely root cause.`);
      return;
    }

    if (action === "faq") {
      const detail = selectedTicket?.subject ?? "this issue";
      void submitMessage(`Send me the best FAQ steps for ${detail}.`);
      return;
    }

    void submitMessage("This issue is not solved. Please escalate me to a human agent.");
  }

  return (
    <section className="ops-chat-workspace">
      <div className="ops-chat-conversation-head">
        <div>
          <strong>{selectedTicket ? selectedTicket.id.replace("TKT", "Ticket #AI-") : "Live Support Session"}</strong>
          <span>{selectedTicket ? selectedTicket.subject : "Start a guided support conversation."}</span>
        </div>
        <div className="ops-chat-conversation-meta">
          <span>
            Assigned to: <strong>{selectedTicket?.status === "escalated" ? "Human Escalation Desk" : "OmniBot 4.0"}</strong>
          </span>
          {session ? <label className={`ops-chat-state ${session.status}`}>{session.status}</label> : null}
        </div>
      </div>

      <div className="ops-chat-transcript-shell">
        <div className="ops-chat-transcript">
          {transcript.length ? (
            transcript.map((message, index) => (
              <article className={`ops-chat-bubble ${message.role}`} key={message.id}>
                <div className="ops-chat-bubble-head">
                  <label>{message.role === "assistant" ? "OmniBot 4.0" : userName}</label>
                  <span>
                    {session?.messages[index]?.createdAt
                      ? formatDateTime(session.messages[index].createdAt)
                      : selectedTicket
                        ? formatDateTime(
                            message.role === "user" ? selectedTicket.createdAt : selectedTicket.updatedAt
                          )
                        : "Live now"}
                  </span>
                </div>
              <p>{message.content}</p>
              </article>
            ))
          ) : (
            <div className="ops-chat-empty">
              Start the chatbot here. Once the issue needs a human, the system will create a ticket and forward the
              summary to the admin desk.
            </div>
          )}
        </div>

        {session?.summary || selectedTicket?.chatSummary ? (
          <div className="ops-chat-summary">
            <strong>Live Summary</strong>
            <p>{session?.summary ?? selectedTicket?.chatSummary}</p>
          </div>
        ) : null}
      </div>

      <div className="ops-chat-action-row">
        <button className="ops-chat-action-button" onClick={() => useQuickAction("diagnostic")} type="button">
          Run Diagnostic
        </button>
        <button className="ops-chat-action-button" onClick={() => useQuickAction("faq")} type="button">
          Send API FAQ
        </button>
        <button className="ops-chat-action-button danger" onClick={() => useQuickAction("human")} type="button">
          Escalate to Human
        </button>
      </div>

      <form className="ops-chat-form" onSubmit={handleSend}>
        <div className="ops-chat-compose">
          <textarea
            className="ops-dark-input ops-chat-textarea"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type your response or use '/' for commands..."
            value={draft}
          />
          <button className="ops-primary-button ops-chat-send-button" disabled={isPending} type="submit">
            {isPending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>

      {feedback ? <div className="ops-inline-note-block">{feedback}</div> : null}
    </section>
  );
}
