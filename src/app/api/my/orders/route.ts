import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/apiUtils";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireRole("CUSTOMER", "ADMIN", "STAFF");
    const orders = await query(
      `SELECT o.*, e.name as event_name, e.slug as event_slug, e.start_date, e.cover_image_url,
              (SELECT COUNT(*) FROM tickets t WHERE t.order_id = o.id) as ticket_count
       FROM orders o JOIN events e ON e.id = o.event_id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC`,
      [session.userId]
    );
    return NextResponse.json({ orders });
  } catch (err) {
    return handleApiError(err);
  }
}
