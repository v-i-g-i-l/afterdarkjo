import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { zipTicketsForOrder } from "@/lib/services/ticketFiles";
import { handleApiError, jsonError } from "@/lib/apiUtils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await queryOne<{ id: string; customer_id: string | null; order_number: string }>(
      `SELECT id, customer_id, order_number FROM orders WHERE id = $1`,
      [id]
    );
    if (!order) return jsonError(404, "NOT_FOUND", "Order not found.");

    const session = await getSession();
    if (
      order.customer_id &&
      (!session || (session.userId !== order.customer_id && session.role === "CUSTOMER"))
    ) {
      return jsonError(403, "FORBIDDEN", "You do not have access to this order.");
    }

    const zip = await zipTicketsForOrder(id);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${order.order_number}-tickets.zip"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
