import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { updateTicketStatus } from "@/lib/tickets";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const body = await request.json();
    const adminEmail = String(body.adminEmail ?? "").toLowerCase();

    if (!adminEmail.endsWith(`@${appConfig.adminDomain.toLowerCase()}`)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Only @adypu.edu.in admins can update tickets."
        },
        { status: 403 }
      );
    }

    const ticket = await updateTicketStatus(ticketId, String(body.status ?? ""), String(body.assignedTo ?? ""));

    return NextResponse.json({
      ok: true,
      ticket
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to update ticket."
      },
      { status: 400 }
    );
  }
}
