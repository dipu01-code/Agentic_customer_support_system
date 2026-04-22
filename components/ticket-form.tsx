"use client";

import { useState, useTransition } from "react";

const initialState = {
  subject: "",
  message: "",
  channel: "web"
};

type TicketFormProps = {
  userName: string;
  userEmail: string;
};

export function TicketForm({ userName, userEmail }: TicketFormProps) {
  const [form, setForm] = useState(initialState);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          customerName: userName,
          email: userEmail
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setFeedback(result.message ?? "Something went wrong.");
        return;
      }

      setFeedback(`Ticket created: ${result.ticket.id}`);
      setForm(initialState);
    });
  }

  return (
    <form className="customer-ticket-form" onSubmit={handleSubmit}>
      <div className="customer-form-stack">
        <div>
          <label htmlFor="subject">Ticket Subject</label>
          <input
            className="ops-dark-input"
            id="subject"
            name="subject"
            onChange={(event) => updateField(event.target.name, event.target.value)}
            placeholder="e.g. API authentication failure in production"
            required
            value={form.subject}
          />
        </div>

        <div>
          <label htmlFor="channel">Channel</label>
          <select
            className="ops-dark-input"
            id="channel"
            name="channel"
            onChange={(event) => updateField(event.target.name, event.target.value)}
            value={form.channel}
          >
            <option value="web">web</option>
            <option value="email">email</option>
            <option value="whatsapp">whatsapp</option>
          </select>
        </div>

        <div>
          <label htmlFor="message">Customer Message</label>
          <textarea
            className="ops-dark-input customer-form-textarea"
            id="message"
            name="message"
            onChange={(event) => updateField(event.target.name, event.target.value)}
            placeholder="Describe the issue, what you expected, and any urgent impact."
            required
            value={form.message}
          />
        </div>
      </div>

      <div className="button-row">
        <button className="ops-primary-button" disabled={isPending} type="submit">
          {isPending ? "Submitting..." : "Send Response"}
        </button>
        <button className="ops-icon-button" type="button">
          Share Report
        </button>
      </div>

      {feedback ? <div className="ops-error-banner">{feedback}</div> : null}
    </form>
  );
}
