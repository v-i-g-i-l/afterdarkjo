import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleApiError, jsonError } from "@/lib/apiUtils";
import { rejectPayment } from "@/lib/services/payments";
import { getOrderWithDetails } from "@/lib/services/orders";
import { sendMail, paymentRejectedEmail } from "@/lib/services/mailer";

const schema = z.object({
  reason: z.enum([
    "PAYMENT_NOT_RECEIVED",
    "INCORRECT_AMOUNT",
    "INCORRECT_RECIPIENT",
    "REFERENCE_MISMATCH",
    "DUPLICATE_PAYMENT",
    "OTHER",
  ]),
  note: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const body = schema.parse(await req.json());

    const order = await rejectPayment(id, session.userId, body.reason, body.note);

    try {
      const details = await getOrderWithDetails(id);
      const orderRow = details?.order as
        | { customer_full_name: string; order_number: string; email: string; event_name?: string }
        | undefined;
      if (orderRow) {
        await sendMail({
          to: orderRow.email,
          subject: `Update on your order ${orderRow.order_number}`,
          html: paymentRejectedEmail({
            customerName: orderRow.customer_full_name,
            eventName: orderRow.event_name || "your event",
            orderNumber: orderRow.order_number,
            reason: body.reason.replace(/_/g, " ").toLowerCase(),
          }),
        });
      }
    } catch (mailErr) {
      console.error("Failed to send rejection email:", mailErr);
    }

    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", "Please choose a valid rejection reason.");
    }
    return handleApiError(err);
  }
}
