import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/apiUtils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const event = await queryOne(
      `SELECT e.*, v.name as venue_name, v.address as venue_address, v.city as venue_city,
              c.name as category_name, c.slug as category_slug
       FROM events e
       JOIN venues v ON v.id = e.venue_id
       JOIN categories c ON c.id = e.category_id
       WHERE e.slug = $1 AND e.is_published = TRUE`,
      [slug]
    );
    if (!event) {
      return jsonError(404, "NOT_FOUND", "Event not found.");
    }
    const ticketTypes = await query(
      `SELECT id, name, description, price, currency,
              (total_inventory - reserved_count - sold_count) as remaining,
              total_inventory, is_active
       FROM ticket_types
       WHERE event_id = $1 AND is_active = TRUE
       ORDER BY sort_order ASC, price ASC`,
      [(event as { id: string }).id]
    );
    return NextResponse.json({ event, ticketTypes });
  } catch (err) {
    return handleApiError(err);
  }
}
