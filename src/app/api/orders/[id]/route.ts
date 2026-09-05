import { NextResponse } from "next/server";
import { getOrderWithDetails } from "@/lib/services/orders";
import { getSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/apiUtils";
import { query } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const details = await getOrderWithDetails(id);
    if (!details) return jsonError(404, "NOT_FOUND", "Order not found.");

    const session = await getSession();
    const order = details.order as { customer_id: string | null };
    // Orders are addressable by their unguessable ID (guest checkout support).
    // If the order belongs to a registered account, only that account (or an
    // admin) may view it once logged in from elsewhere.
    if (order.customer_id && session && session.userId !== order.customer_id && session.role === "CUSTOMER") {
      return jsonError(403, "FORBIDDEN", "You do not have access to this order.");
    }

    const settings = await query(`SELECT * FROM site_settings WHERE id = 1`);

    return NextResponse.json({ ...details, settings: settings[0] });
  } catch (err) {
    return handleApiError(err);
  }
}
