# Agentic Customer Support System

Production-oriented starter for your n8n-based support workflow with two clear user roles:

- `Customer / User`: submits support requests from the public portal
- `Human Agent / Admin`: logs in to review escalated tickets, assign ownership, and close conversations

## What this project includes

- Next.js app with a customer-facing query form
- Built-in support chatbot with n8n-ready webhook handoff
- Google sign-in for both customers and admins
- Role-restricted admin dashboard based on Google email domain
- Ticket intake API at `/api/tickets`
- Chatbot API at `/api/chat`
- Basic auto-triage for category, urgency, and sentiment
- Optional n8n webhook forwarding on ticket create and update
- Per-user admin summary cards sourced from chatbot conversations
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
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=""
N8N_CHAT_WEBHOOK_URL=""
N8N_WEBHOOK_URL=""
N8N_ADMIN_WEBHOOK_URL=""
N8N_WEBHOOK_SECRET=""
```

You can copy these values from Firebase Console -> Project settings -> General -> Your apps -> Web app.

## Chatbot and escalation flow

1. A signed-in customer starts a conversation with the built-in chatbot.
2. The app stores the transcript and keeps a rolling summary for admins.
3. If `N8N_CHAT_WEBHOOK_URL` is configured, the latest message and chat context are forwarded to n8n for a reply.
4. If the issue is urgent or remains unresolved, the app auto-creates a human support ticket.
5. Admins can review both the ticket queue and the per-user chat summary section in `/admin`.

## Firebase auth setup for Vercel deployment

If Google sign-in works locally but fails on Vercel with `Firebase: Error (auth/unauthorized-domain)`, the code is usually fine and Firebase is rejecting the deployed hostname.

Before testing production, do all of the following:

1. In Firebase Console -> Authentication -> Sign-in method, enable `Google`.
2. In Firebase Console -> Authentication -> Settings -> Authorized domains, add:
   - `agentic-customer-support-system.vercel.app`
   - your custom production domain, if you use one
3. In Vercel -> Project -> Settings -> Environment Variables, set all `NEXT_PUBLIC_FIREBASE_*` values from your Firebase web app.
4. Redeploy after changing Firebase env vars in Vercel.

Without step 2, Firebase blocks the popup even if every environment variable is correct.

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

1. Create a Firebase project, enable Google sign-in, and fill the `NEXT_PUBLIC_FIREBASE_*` variables in Vercel.
2. Store tickets in PostgreSQL instead of `data/tickets.json`.
3. Add your production domain to Firebase Authorized domains.
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
