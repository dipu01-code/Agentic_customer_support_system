# Production Checklist

## Role model

This project is built around two clear roles:

### 1. Customer / User

- Submits a support query from the public portal
- Does not access admin controls
- Receives AI-first support through your n8n workflow

### 2. Human Agent / Admin

- Logs in to the admin dashboard
- Reviews escalated or unresolved issues
- Assigns ownership and updates ticket status

## n8n production checklist

1. Point `N8N_WEBHOOK_URL` to your intake workflow.
2. Add `N8N_WEBHOOK_SECRET` and validate it inside n8n before processing.
3. In n8n, split the workflow into:
   - intake classifier
   - FAQ responder
   - sentiment analyzer
   - escalation router
4. Return a normalized payload so your app and dashboard stay consistent.
5. Send Slack, email, or WhatsApp notifications for `escalated` tickets.
6. Add retries and error paths in n8n for webhook failures.

## App production checklist

1. Replace `data/tickets.json` with PostgreSQL.
2. Replace env-password login with real authentication.
3. Add rate limiting and bot protection on `/api/tickets`.
4. Add structured logging and error monitoring.
5. Add admin audit logs for status and assignment changes.
6. Add backup and retention policies for ticket records.
7. Use HTTPS and strong secrets in deployment.

## Suggested database tables

- `tickets`
- `ticket_messages`
- `admin_users`
- `audit_logs`
- `faq_documents`
