import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleApiError, jsonError } from "@/lib/apiUtils";
import { queryOne } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().nonnegative().optional(),
  totalInventory: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const columnMap: Record<string, string> = {
  name: "name",
  description: "description",
  price: "price",
  totalInventory: "total_inventory",
  isActive: "is_active",
  sortOrder: "sort_order",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const body = schema.parse(await req.json());
    const entries = Object.entries(body).filter(([, v]) => v !== undefined);
    if (!entries.length) return jsonError(400, "NO_FIELDS", "No fields to update.");

    if (body.totalInventory !== undefined) {
      const current = await queryOne<{ sold_count: number; reserved_count: number }>(
        `SELECT sold_count, reserved_count FROM ticket_types WHERE id = $1`,
        [id]
      );
      if (current && body.totalInventory < current.sold_count + current.reserved_count) {
        return jsonError(
          400,
          "INVENTORY_TOO_LOW",
          `Inventory cannot be lower than tickets already sold/reserved (${current.sold_count + current.reserved_count}).`
        );
      }
    }

    const setClauses = entries.map(([k], i) => `${columnMap[k]} = $${i + 2}`);
    const values = entries.map(([k, v]) => (k === "price" ? Number(v).toFixed(2) : v));

    const ticketType = await queryOne(
      `UPDATE ticket_types SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    if (!ticketType) return jsonError(404, "NOT_FOUND", "Ticket type not found.");
    return NextResponse.json({ ticketType });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.");
    }
    return handleApiError(err);
  }
}
