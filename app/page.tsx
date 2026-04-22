import { appConfig } from "@/lib/config";
import { CustomerConsole } from "@/components/customer-console";
import { getTicketStats, listTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [stats, tickets, params] = await Promise.all([getTicketStats(), listTickets(), searchParams]);
  return <CustomerConsole adminDomain={appConfig.adminDomain} error={params.error} stats={stats} tickets={tickets} />;
}
