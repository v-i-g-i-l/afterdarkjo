import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getOrCreateTicketPdf } from "@/lib/services/ticketFiles";
import { handleApiError, jsonError } from "@/lib/apiUtils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = await queryOne<{
      id: string;
      ticket_number: string;
      order_id: string;
      customer_id: string | null;
    }>(
      `SELECT t.id, t.ticket_number, t.order_id, o.customer_id
       FROM tickets t JOIN orders o ON o.id = t.order_id
       WHERE t.id = $1`,
      [id]
    );
    if (!ticket) return jsonError(404, "NOT_FOUND", "Ticket not found.");

    const session = await getSession();
    if (
      ticket.customer_id &&
      (!session || (session.userId !== ticket.customer_id && session.role === "CUSTOMER"))
    ) {
      return jsonError(403, "FORBIDDEN", "You do not have access to this ticket.");
    }

    const pdf = await getOrCreateTicketPdf(id);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${ticket.ticket_number}.pdf"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
