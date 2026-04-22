import { NextRequest, NextResponse } from "next/server";
import { createTicket, getTicketStats, listTickets } from "@/lib/tickets";

export async function GET() {
  try {
    const [tickets, stats] = await Promise.all([listTickets(), getTicketStats()]);

    return NextResponse.json({
      ok: true,
      tickets,
      stats
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
