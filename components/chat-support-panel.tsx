"use client";

import { useState, useTransition } from "react";
import type { ChatMessage, ChatSession, Ticket } from "@/lib/types";

type ChatSupportPanelProps = {
  userName: string;
  userEmail: string;
};

type ChatResponse = {
  ok: boolean;
  session: ChatSession;
  reply: ChatMessage;
  escalated: boolean;
  ticket: Ticket | null;
  message?: string;
};

export function ChatSupportPanel({ userName, userEmail }: ChatSupportPanelProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();

    if (!message) {
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
          message,
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

  return (
    <section className="ops-chat-panel">
      <div className="ops-chat-panel-head">
        <div>
          <strong>AI Support Chat</strong>
          <span>Every chat is summarized for admins. Unresolved cases create a human ticket automatically.</span>
        </div>
        {session ? <label className={`ops-chat-state ${session.status}`}>{session.status}</label> : null}
      </div>

      <div className="ops-chat-transcript">
        {session?.messages.length ? (
          session.messages.map((message) => (
            <article className={`ops-chat-bubble ${message.role}`} key={message.id}>
              <label>{message.role === "assistant" ? "AI Support Agent" : "Customer"}</label>
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

      {session?.summary ? (
        <div className="ops-chat-summary">
          <strong>Live Summary</strong>
          <p>{session.summary}</p>
        </div>
      ) : null}

      <form className="ops-chat-form" onSubmit={handleSend}>
        <textarea
          className="ops-dark-input ops-chat-textarea"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Tell the support bot what issue you are facing."
          value={draft}
        />
        <div className="button-row">
          <button className="ops-primary-button" disabled={isPending} type="submit">
            {isPending ? "Sending..." : "Send to Chatbot"}
          </button>
        </div>
      </form>

      {feedback ? <div className="ops-inline-note-block">{feedback}</div> : null}
    </section>
  );
}
