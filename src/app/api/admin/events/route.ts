import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleApiError, jsonError } from "@/lib/apiUtils";
import { query, queryOne } from "@/lib/db";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const events = await query(
      `SELECT e.*, v.name as venue_name, c.name as category_name,
              (SELECT COUNT(*) FROM tickets t WHERE t.event_id = e.id) as tickets_sold
       FROM events e
       JOIN venues v ON v.id = e.venue_id
       JOIN categories c ON c.id = e.category_id
       ORDER BY e.start_date DESC`
    );
    return NextResponse.json({ events });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and dashes only."),
  description: z.string().min(1),
  rules: z.string().optional(),
  ageRestriction: z.string().optional(),
  dressCode: z.string().optional(),
  coverImageUrl: z.string().optional(),
  categoryId: z.string().min(1),
  venueId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  isPublished: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN");
    const body = schema.parse(await req.json());

    const existing = await queryOne(`SELECT id FROM events WHERE slug = $1`, [
      body.slug,
    ]);
    if (existing) {
      return jsonError(409, "SLUG_TAKEN", "An event with this URL slug already exists.");
    }

    const event = await queryOne(
      `INSERT INTO events
        (slug, name, description, rules, age_restriction, dress_code, cover_image_url,
         category_id, venue_id, start_date, end_date, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        body.slug,
        body.name,
        body.description,
        body.rules ?? null,
        body.ageRestriction ?? null,
        body.dressCode ?? null,
        body.coverImageUrl ?? null,
        body.categoryId,
        body.venueId,
        body.startDate,
        body.endDate,
        body.isPublished,
      ]
    );
    return NextResponse.json({ event });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.");
    }
    return handleApiError(err);
  }
}
