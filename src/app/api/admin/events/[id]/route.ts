import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleApiError, jsonError } from "@/lib/apiUtils";
import { query, queryOne } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { id } = await params;
    const event = await queryOne(`SELECT * FROM events WHERE id = $1`, [id]);
    if (!event) return jsonError(404, "NOT_FOUND", "Event not found.");
    const ticketTypes = await query(
      `SELECT * FROM ticket_types WHERE event_id = $1 ORDER BY sort_order, price`,
      [id]
    );
    return NextResponse.json({ event, ticketTypes });
  } catch (err) {
    return handleApiError(err);
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(1).optional(),
  rules: z.string().nullable().optional(),
  ageRestriction: z.string().nullable().optional(),
  dressCode: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  categoryId: z.string().min(1).optional(),
  venueId: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const columnMap: Record<string, string> = {
  name: "name",
  description: "description",
  rules: "rules",
  ageRestriction: "age_restriction",
  dressCode: "dress_code",
  coverImageUrl: "cover_image_url",
  categoryId: "category_id",
  venueId: "venue_id",
  startDate: "start_date",
  endDate: "end_date",
  isPublished: "is_published",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const entries = Object.entries(body).filter(([, v]) => v !== undefined);
    if (!entries.length) return jsonError(400, "NO_FIELDS", "No fields to update.");

    const setClauses = entries.map(([k], i) => `${columnMap[k]} = $${i + 2}`);
    const values = entries.map(([, v]) => v);

    const event = await queryOne(
      `UPDATE events SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    if (!event) return jsonError(404, "NOT_FOUND", "Event not found.");
    return NextResponse.json({ event });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.");
    }
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const sold = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM tickets WHERE event_id = $1`,
      [id]
    );
    if (Number(sold?.count ?? 0) > 0) {
      return jsonError(
        409,
        "HAS_TICKETS",
        "This event has issued tickets and cannot be deleted. Unpublish it instead."
      );
    }
    await query(`DELETE FROM ticket_types WHERE event_id = $1`, [id]);
    await query(`DELETE FROM events WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
