import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/apiUtils";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireRole("CUSTOMER", "ADMIN", "STAFF");
    const tickets = await query(
      `SELECT t.*, e.name as event_name, e.slug as event_slug, e.start_date, e.cover_image_url,
              v.name as venue_name, tt.name as ticket_type_name, o.order_number
       FROM tickets t
       JOIN orders o ON o.id = t.order_id
       JOIN events e ON e.id = t.event_id
       JOIN venues v ON v.id = e.venue_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       WHERE o.customer_id = $1
       ORDER BY e.start_date ASC`,
      [session.userId]
    );
    return NextResponse.json({ tickets });
  } catch (err) {
    return handleApiError(err);
  }
}
