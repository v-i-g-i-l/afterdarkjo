import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { handleApiError } from "@/lib/apiUtils";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const search = sp.get("q")?.trim();
    const category = sp.get("category")?.trim();
    const city = sp.get("city")?.trim();
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");
    const sort = sp.get("sort") || "date_asc";
    const page = Math.max(1, Number(sp.get("page") || 1));
    const pageSize = Math.min(24, Math.max(1, Number(sp.get("pageSize") || 12)));

    const conditions: string[] = ["e.is_published = TRUE"];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(lower(e.name) LIKE $${params.length} OR lower(v.city) LIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      conditions.push(`c.slug = $${params.length}`);
    }
    if (city) {
      params.push(city);
      conditions.push(`v.city = $${params.length}`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`e.start_date >= $${params.length}`);
    }
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`e.start_date <= $${params.length}`);
    }

    const orderBy =
      sort === "date_desc"
        ? "e.start_date DESC"
        : sort === "price_asc"
        ? "min_price ASC NULLS LAST"
        : sort === "price_desc"
        ? "min_price DESC NULLS LAST"
        : "e.start_date ASC";

    const whereClause = conditions.join(" AND ");
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const rows = await query(
      `SELECT e.id, e.slug, e.name, e.cover_image_url, e.start_date, e.end_date,
              v.name as venue_name, v.city as venue_city, c.name as category_name, c.slug as category_slug,
              (SELECT MIN(price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active) as min_price,
              (SELECT COALESCE(SUM(total_inventory - reserved_count - sold_count), 0)
                 FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active) as remaining
       FROM events e
       JOIN venues v ON v.id = e.venue_id
       JOIN categories c ON c.id = e.category_id
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countRows = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM events e
       JOIN venues v ON v.id = e.venue_id
       JOIN categories c ON c.id = e.category_id
       WHERE ${whereClause}`,
      params
    );

    return NextResponse.json({
      events: rows,
      total: Number(countRows[0]?.count ?? 0),
      page,
      pageSize,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
