import { withTransaction, query } from "@/lib/db";
import { generateQrToken, formatTicketNumber } from "@/lib/services/ids";
import { OrderError } from "@/lib/services/orders";

export interface ApprovalResult {
  alreadyProcessed: boolean;
  order: Record<string, unknown>;
  tickets: Record<string, unknown>[];
}

/**
 * Approves a payment and generates one individual ticket per unit purchased.
 * Fully atomic + idempotent: if the order is already PAID, this is a no-op
 * that simply returns the existing tickets instead of creating duplicates,
 * so an accidental double-click on "Approve" can never double-issue tickets.
 */
export async function approvePayment(
  orderId: string,
  adminId: string
): Promise<ApprovalResult> {
  return withTransaction(async (client) => {
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    const order = orderRes.rows[0];
    if (!order) throw new OrderError("NOT_FOUND", "Order not found.");

    if (order.status === "PAID") {
      // Idempotent short-circuit: already approved previously.
      const existingTickets = await client.query(
        `SELECT * FROM tickets WHERE order_id = $1 ORDER BY ticket_number`,
        [orderId]
      );
      return {
        alreadyProcessed: true,
        order,
        tickets: existingTickets.rows,
      };
    }

    if (order.status !== "PAYMENT_VERIFICATION") {
      throw new OrderError(
        "INVALID_STATE",
        `Order is in status ${order.status} and cannot be approved.`
      );
    }

    const paymentRes = await client.query(
      `SELECT * FROM payments WHERE order_id = $1 FOR UPDATE`,
      [orderId]
    );
    const payment = paymentRes.rows[0];
    if (!payment || payment.status !== "AWAITING_ADMIN_REVIEW") {
      throw new OrderError(
        "INVALID_PAYMENT_STATE",
        "Payment is not awaiting review."
      );
    }

    // 1) Mark payment verified + order paid.
    await client.query(
      `UPDATE payments SET status = 'VERIFIED', verified_at = now(), verified_by_id = $2, updated_at = now()
       WHERE order_id = $1`,
      [orderId, adminId]
    );
    const updatedOrder = await client.query(
      `UPDATE orders SET status = 'PAID', updated_at = now() WHERE id = $1 RETURNING *`,
      [orderId]
    );

    // 2) Move reserved seats -> sold seats per line item.
    const items = await client.query(
      `SELECT oi.*, tt.name as ticket_type_name
       FROM order_items oi JOIN ticket_types tt ON tt.id = oi.ticket_type_id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    let totalUnits = 0;
    for (const item of items.rows as {
      ticket_type_id: string;
      quantity: number;
    }[]) {
      await client.query(
        `UPDATE ticket_types
         SET reserved_count = reserved_count - $1, sold_count = sold_count + $1, updated_at = now()
         WHERE id = $2`,
        [item.quantity, item.ticket_type_id]
      );
      totalUnits += item.quantity;
    }

    // 3) Atomically reserve a contiguous block of sequential ticket numbers.
    const seqRes = await client.query(
      `UPDATE ticket_number_sequence SET last_number = last_number + $1 WHERE id = 1 RETURNING last_number`,
      [totalUnits]
    );
    const lastNumber: number = seqRes.rows[0].last_number;
    const firstNumber = lastNumber - totalUnits + 1;

    // 4) Create one individual ticket per unit, each with its own unique QR token.
    const createdTickets: Record<string, unknown>[] = [];
    let cursor = firstNumber;
    for (const item of items.rows as {
      ticket_type_id: string;
      quantity: number;
    }[]) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketNumber = formatTicketNumber(cursor);
        const qrToken = generateQrToken();
        cursor += 1;
        const ticketRes = await client.query(
          `INSERT INTO tickets
            (ticket_number, qr_token, order_id, customer_name, event_id, ticket_type_id, status)
           VALUES ($1,$2,$3,$4,$5,$6,'VALID')
           RETURNING *`,
          [
            ticketNumber,
            qrToken,
            orderId,
            order.customer_full_name,
            order.event_id,
            item.ticket_type_id,
          ]
        );
        createdTickets.push(ticketRes.rows[0]);
      }
    }

    await client.query(
      `INSERT INTO audit_logs (admin_id, order_id, action, previous_status, new_status)
       VALUES ($1, $2, 'PAYMENT_APPROVED', 'PAYMENT_VERIFICATION', 'PAID')`,
      [adminId, orderId]
    );

    return {
      alreadyProcessed: false,
      order: updatedOrder.rows[0],
      tickets: createdTickets,
    };
  });
}

export type RejectionReason =
  | "PAYMENT_NOT_RECEIVED"
  | "INCORRECT_AMOUNT"
  | "INCORRECT_RECIPIENT"
  | "REFERENCE_MISMATCH"
  | "DUPLICATE_PAYMENT"
  | "OTHER";

export async function rejectPayment(
  orderId: string,
  adminId: string,
  reason: RejectionReason,
  note?: string
) {
  return withTransaction(async (client) => {
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    const order = orderRes.rows[0];
    if (!order) throw new OrderError("NOT_FOUND", "Order not found.");
    if (order.status === "PAID") {
      throw new OrderError(
        "ALREADY_PAID",
        "This order is already paid and cannot be rejected."
      );
    }
    if (order.status === "PAYMENT_REJECTED") {
      return order; // idempotent
    }
    if (order.status !== "PAYMENT_VERIFICATION") {
      throw new OrderError(
        "INVALID_STATE",
        `Order is in status ${order.status} and cannot be rejected.`
      );
    }

    const paymentRes = await client.query(
      `SELECT * FROM payments WHERE order_id = $1 FOR UPDATE`,
      [orderId]
    );
    const payment = paymentRes.rows[0];
    if (!payment || payment.status !== "AWAITING_ADMIN_REVIEW") {
      throw new OrderError(
        "INVALID_PAYMENT_STATE",
        "Payment is not awaiting review."
      );
    }

    await client.query(
      `UPDATE payments SET status = 'REJECTED', rejection_reason = $2, admin_note = $3, updated_at = now()
       WHERE order_id = $1`,
      [orderId, reason, note ?? null]
    );
    const updatedOrder = await client.query(
      `UPDATE orders SET status = 'PAYMENT_REJECTED', updated_at = now() WHERE id = $1 RETURNING *`,
      [orderId]
    );

    // Release reserved inventory back to the pool.
    const items = await client.query(
      `SELECT ticket_type_id, quantity FROM order_items WHERE order_id = $1`,
      [orderId]
    );
    for (const item of items.rows as {
      ticket_type_id: string;
      quantity: number;
    }[]) {
      await client.query(
        `UPDATE ticket_types SET reserved_count = reserved_count - $1, updated_at = now() WHERE id = $2`,
        [item.quantity, item.ticket_type_id]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (admin_id, order_id, action, previous_status, new_status, reason)
       VALUES ($1, $2, 'PAYMENT_REJECTED', 'PAYMENT_VERIFICATION', 'PAYMENT_REJECTED', $3)`,
      [adminId, orderId, reason]
    );

    return updatedOrder.rows[0];
  });
}

export async function listPendingPayments() {
  return query(
    `SELECT o.id as order_id, o.order_number, o.customer_full_name, o.email, o.phone,
            o.total_amount, o.currency, o.created_at, o.status as order_status,
            e.name as event_name,
            p.id as payment_id, p.status as payment_status, p.submitted_at, p.method,
            (SELECT json_agg(json_build_object('ticketType', tt.name, 'quantity', oi.quantity))
               FROM order_items oi JOIN ticket_types tt ON tt.id = oi.ticket_type_id
               WHERE oi.order_id = o.id) as line_items
     FROM orders o
     JOIN payments p ON p.order_id = o.id
     JOIN events e ON e.id = o.event_id
     WHERE o.status = 'PAYMENT_VERIFICATION' AND p.status = 'AWAITING_ADMIN_REVIEW'
     ORDER BY p.submitted_at ASC`
  );
}
