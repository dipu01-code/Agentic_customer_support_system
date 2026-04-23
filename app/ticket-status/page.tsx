import { appConfig } from "@/lib/config";
import { getTicketStats, listTickets } from "@/lib/tickets";
import { CustomerTicketStatusPage } from "@/components/customer-ticket-status-page";

export const dynamic = "force-dynamic";

export default async function TicketStatusPage() {
  const [stats, tickets] = await Promise.all([getTicketStats(), listTickets()]);

  return <CustomerTicketStatusPage adminDomain={appConfig.adminDomain} initialStats={stats} tickets={tickets} />;
}
