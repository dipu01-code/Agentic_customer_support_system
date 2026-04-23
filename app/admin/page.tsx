import { getCustomerSummaries } from "@/lib/chat";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getTicketStats, listTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const [stats, tickets, customerSummaries] = await Promise.all([getTicketStats(), listTickets(), getCustomerSummaries()]);
  const params = await searchParams;

  return (
    <AdminDashboard
      customerSummaries={customerSummaries}
      initialStats={stats}
      initialTickets={tickets}
      initialView={params.view}
    />
  );
}
