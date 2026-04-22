import { getCustomerSummaries } from "@/lib/chat";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getTicketStats, listTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, tickets, customerSummaries] = await Promise.all([getTicketStats(), listTickets(), getCustomerSummaries()]);
  return <AdminDashboard customerSummaries={customerSummaries} initialStats={stats} initialTickets={tickets} />;
}
