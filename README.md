# Agentic Customer Support System

Production-oriented starter for your n8n-based support workflow with two clear user roles:

- `Customer / User`: submits support requests from the public portal
- `Human Agent / Admin`: logs in to review escalated tickets, assign ownership, and close conversations

## What this project includes

- Next.js app with a customer-facing query form
- Google sign-in for both customers and admins
- Role-restricted admin dashboard based on Google email domain
- Ticket intake API at `/api/tickets`
- Basic auto-triage for category, urgency, and sentiment
- Optional n8n webhook forwarding on ticket create and update
- Local JSON storage for quick demo and testing
- SQL schema you can use to move to PostgreSQL for real production persistence

## Recommended production architecture

1. Customer submits a message from the web form, chat widget, or email webhook.
2. `/api/tickets` validates and stores the ticket.
3. The app forwards the event to `N8N_WEBHOOK_URL`.
4. n8n runs your classifier, FAQ responder, sentiment analyzer, and escalation workflow.
5. If the case is complex, the ticket stays visible in the admin dashboard for the human agent.
6. Admin updates ticket assignment and resolution status.

## Environment variables

Copy `.env.example` to `.env.local` and update:

```bash
APP_NAME="Agentic Customer Support System"
APP_URL="http://localhost:3000"
ADMIN_DOMAIN="adypu.edu.in"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
N8N_WEBHOOK_URL=""
N8N_ADMIN_WEBHOOK_URL=""
N8N_WEBHOOK_SECRET=""
```

## Local run

```bash
npm install
npm run dev
```

Open:

- Customer portal: `http://localhost:3000`
- Admin login: `http://localhost:3000/admin/login`

## Default roles in this starter

### 1. Customer / User

- Signs in with Google
- Creates support requests
- Does not access internal ticket controls

### 2. Human Agent / Admin

- Signs in with Google
- Any verified Google account ending in `@adypu.edu.in` is treated as an admin
- Can see all tickets
- Can assign themselves or another agent
- Can move tickets between `open`, `escalated`, `waiting_on_customer`, and `resolved`

## Moving from demo-ready to real production

For actual deployment, replace the local JSON file with PostgreSQL, Supabase, Neon, or another managed database using `database/schema.sql`.

Recommended hardening checklist:

1. Create a Google OAuth app and fill `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET`.
2. Store tickets in PostgreSQL instead of `data/tickets.json`.
3. Put the app behind HTTPS and rotate `SESSION_SECRET`.
4. Add rate limiting to `/api/tickets`.
5. Add audit logs for admin actions.
6. Add email notifications or Slack alerts for escalations.
7. Add validation and monitoring around your n8n webhook responses.

## n8n payload shape

On create or update, the app can POST this JSON to your webhook:

```json
{
  "event": "ticket.created",
  "ticket": {
    "id": "TKT-1234ABCD",
    "customerName": "Riya Sharma",
    "email": "riya@example.com",
    "subject": "Payment issue",
    "message": "My payment failed and I need help urgently.",
    "channel": "web",
    "category": "billing",
    "urgency": "high",
    "sentiment": "negative",
    "status": "escalated",
    "assignedTo": null,
    "source": "portal",
    "createdAt": "2026-04-22T15:00:00.000Z",
    "updatedAt": "2026-04-22T15:00:00.000Z"
  }
}
```

## Suggested deployment options

- Vercel for the Next.js frontend and API
- Railway / Render / Fly.io if you want app + database together
- Supabase or Neon for PostgreSQL
- n8n Cloud or self-hosted n8n for orchestration
