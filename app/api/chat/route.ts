import { NextRequest, NextResponse } from "next/server";
import { sendChatMessage } from "@/lib/chat";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await sendChatMessage(payload);

    return NextResponse.json({
      ok: true,
      session: result.session,
      reply: result.reply,
      escalated: result.escalated,
      ticket: result.ticket
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to process chat message."
      },
      { status: 400 }
    );
  }
}
