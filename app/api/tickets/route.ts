import { NextRequest, NextResponse } from "next/server";
import { getCustomerSummaries } from "@/lib/chat";
import { createTicket, getTicketStats, listTickets } from "@/lib/tickets";

export async function GET() {
  try {
    const [tickets, stats, customerSummaries] = await Promise.all([
      listTickets(),
      getTicketStats(),
      getCustomerSummaries()
    ]);

    return NextResponse.json({
      ok: true,
      tickets,
      stats,
      customerSummaries
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to fetch tickets."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const ticket = await createTicket(payload);

    return NextResponse.json(
      {
        ok: true,
        message: "Support request created successfully.",
        ticket
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create ticket."
      },
      { status: 400 }
    );
  }
}
