import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/apiUtils";
import { approvePayment } from "@/lib/services/payments";
import { getOrderWithDetails } from "@/lib/services/orders";
import { sendMail, orderConfirmationEmail } from "@/lib/services/mailer";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("ADMIN");
    const { id } = await params;
    const result = await approvePayment(id, session.userId);

    if (!result.alreadyProcessed) {
      // Fire confirmation email after commit; failures here shouldn't break approval.
      try {
        const details = await getOrderWithDetails(id);
        const order = details?.order as
          | { customer_full_name: string; order_number: string; total_amount: string; currency: string; email: string }
          | undefined;
        if (order) {
          const appUrl = process.env.APP_URL || "http://localhost:3000";
          await sendMail({
            to: order.email,
            subject: `Your tickets for order ${order.order_number} are ready`,
            html: orderConfirmationEmail({
              customerName: order.customer_full_name,
              eventName: (details?.order as { event_name?: string })?.event_name || "your event",
              orderNumber: order.order_number,
              amount: order.total_amount,
              currency: order.currency,
              ticketCount: result.tickets.length,
              ticketsUrl: `${appUrl}/account/tickets`,
            }),
          });
        }
      } catch (mailErr) {
        console.error("Failed to send confirmation email:", mailErr);
      }
    }

    return NextResponse.json({
      alreadyProcessed: result.alreadyProcessed,
      order: result.order,
      tickets: result.tickets,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
