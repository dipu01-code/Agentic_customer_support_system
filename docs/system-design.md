# System Design

## User roles

### Customer / User

- Enters a support query from the public portal
- Can be a website visitor, product user, or inbound lead
- Only creates requests and waits for updates

### Human Agent / Admin

- Logs into the protected admin desk
- Reviews escalated tickets
- Assigns tickets to a support person
- Resolves or follows up on sensitive issues

## Agent flow

1. User submits a query.
2. App stores the ticket and forwards it to n8n.
3. n8n runs:
   - intake classifier
   - FAQ responder
   - sentiment analyzer
   - escalation handler
4. If the issue is simple, the workflow can auto-respond.
5. If the issue is risky, urgent, or negative, it is escalated.
6. Human agent updates the case from the admin dashboard.

## Suggested future improvements

- Add per-user login for customers so they can track their own tickets
- Add multi-agent admin support with role permissions
- Store full message history instead of one ticket message
- Add SLA timers and escalation deadlines
- Add analytics widgets for response time and resolution rate
