import { AdminDashboard } from "@/components/admin-dashboard";
import { getTicketStats, listTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [stats, tickets] = await Promise.all([getTicketStats(), listTickets()]);
  return <AdminDashboard initialStats={stats} initialTickets={tickets} />;
}
