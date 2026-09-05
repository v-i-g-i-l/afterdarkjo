import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleApiError, jsonError } from "@/lib/apiUtils";
import { queryOne } from "@/lib/db";

const schema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  totalInventory: z.number().int().min(0),
  sortOrder: z.number().int().default(0),
});

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN");
    const body = schema.parse(await req.json());
    const ticketType = await queryOne(
      `INSERT INTO ticket_types (event_id, name, description, price, total_inventory, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        body.eventId,
        body.name,
        body.description ?? null,
        body.price.toFixed(2),
        body.totalInventory,
        body.sortOrder,
      ]
    );
    return NextResponse.json({ ticketType });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.");
    }
    return handleApiError(err);
  }
}
