import type { PoolClient } from "pg";
import { withTransaction, query, queryOne } from "@/lib/db";
import { generateOrderNumber } from "@/lib/services/ids";

export class OrderError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface CartLine {
  ticketTypeId: string;
  quantity: number;
}

export interface CreateOrderInput {
  eventId: string;
  customerId: string | null;
  customerFullName: string;
  email: string;
  phone: string;
  lines: CartLine[];
}

/** Validates the mandatory "three-part name" rule. Throws OrderError if invalid. */
export function assertThreePartName(rawName: string): string {
  const trimmed = rawName.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ").filter(Boolean);
  if (!trimmed || parts.length < 3) {
    throw new OrderError(
      "INVALID_NAME",
      "Please enter your full three-part name exactly as it should appear on your ticket."
    );
  }
  return trimmed;
}

/**
 * Releases inventory for any AWAITING_PAYMENT order whose reservation has
 * expired, moving the order to EXPIRED and freeing reserved seats. Safe to
 * call frequently (e.g. before every checkout attempt, and from a cron hit).
 */
export async function expireStaleReservations(): Promise<number> {
  return withTransaction(async (client) => {
    const stale = await client.query(
      `SELECT id FROM orders
       WHERE status = 'AWAITING_PAYMENT' AND reservation_expires_at < now()
       FOR UPDATE SKIP LOCKED`
    );
    for (const row of stale.rows as { id: string }[]) {
      const items = await client.query(
        `SELECT ticket_type_id, quantity FROM order_items WHERE order_id = $1`,
        [row.id]
      );
      for (const item of items.rows as {
        ticket_type_id: string;
        quantity: number;
      }[]) {
        await client.query(
          `UPDATE ticket_types SET reserved_count = reserved_count - $1 WHERE id = $2`,
          [item.quantity, item.ticket_type_id]
        );
      }
      await client.query(
        `UPDATE orders SET status = 'EXPIRED', updated_at = now() WHERE id = $1`,
        [row.id]
      );
      await client.query(
        `UPDATE payments SET status = 'EXPIRED', updated_at = now() WHERE order_id = $1 AND status = 'PENDING'`,
        [row.id]
      );
      await client.query(
        `INSERT INTO audit_logs (order_id, action, previous_status, new_status, reason)
         VALUES ($1, 'RESERVATION_EXPIRED', 'AWAITING_PAYMENT', 'EXPIRED', 'Reservation window elapsed without payment submission')`,
        [row.id]
      );
    }
    return stale.rows.length;
  });
}

async function lockTicketTypeForUpdate(client: PoolClient, id: string) {
  const res = await client.query(
    `SELECT * FROM ticket_types WHERE id = $1 FOR UPDATE`,
    [id]
  );
  return res.rows[0] as
    | {
        id: string;
        event_id: string;
        name: string;
        price: string;
        currency: string;
        total_inventory: number;
        reserved_count: number;
        sold_count: number;
        is_active: boolean;
      }
    | undefined;
}

/**
 * Creates an order + reserves inventory atomically. Overselling is prevented
 * by row-locking each ticket type (`FOR UPDATE`) inside one transaction and
 * checking capacity before incrementing reserved_count, so two simultaneous
 * buyers competing for the last seat cannot both succeed.
 */
export async function createOrder(input: CreateOrderInput) {
  await expireStaleReservations();
  const customerFullName = assertThreePartName(input.customerFullName);

  if (!input.lines.length) {
    throw new OrderError("EMPTY_CART", "Select at least one ticket.");
  }
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new OrderError("INVALID_QUANTITY", "Invalid ticket quantity.");
    }
  }

  return withTransaction(async (client) => {
    const settings = await client.query(
      `SELECT reservation_minutes FROM site_settings WHERE id = 1`
    );
    const reservationMinutes = settings.rows[0]?.reservation_minutes ?? 15;

    const event = await client.query(
      `SELECT id, is_published FROM events WHERE id = $1 FOR UPDATE`,
      [input.eventId]
    );
    if (!event.rows[0]) {
      throw new OrderError("EVENT_NOT_FOUND", "This event could not be found.");
    }
    if (!event.rows[0].is_published) {
      throw new OrderError("EVENT_UNAVAILABLE", "This event is not available for purchase.");
    }

    let total = 0;
    const lineDetails: {
      ticketTypeId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    // Sort ticket type IDs to always lock in a consistent order and avoid deadlocks
    // between concurrent multi-line checkouts.
    const sortedLines = [...input.lines].sort((a, b) =>
      a.ticketTypeId.localeCompare(b.ticketTypeId)
    );

    for (const line of sortedLines) {
      const tt = await lockTicketTypeForUpdate(client, line.ticketTypeId);
      if (!tt || tt.event_id !== input.eventId || !tt.is_active) {
        throw new OrderError(
          "TICKET_TYPE_UNAVAILABLE",
          "One of the selected ticket types is no longer available."
        );
      }
      const remaining = tt.total_inventory - tt.reserved_count - tt.sold_count;
      if (remaining < line.quantity) {
        throw new OrderError(
          "SOLD_OUT",
          `Only ${Math.max(remaining, 0)} "${tt.name}" ticket(s) remaining.`
        );
      }
      await client.query(
        `UPDATE ticket_types SET reserved_count = reserved_count + $1, updated_at = now() WHERE id = $2`,
        [line.quantity, tt.id]
      );
      const unitPrice = Number(tt.price);
      const subtotal = unitPrice * line.quantity;
      total += subtotal;
      lineDetails.push({
        ticketTypeId: tt.id,
        quantity: line.quantity,
        unitPrice,
        subtotal,
      });
    }

    let orderNumber = generateOrderNumber();
    // Retry on the astronomically unlikely chance of a collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await client.query(
        `SELECT 1 FROM orders WHERE order_number = $1`,
        [orderNumber]
      );
      if (!existing.rows[0]) break;
      orderNumber = generateOrderNumber();
    }

    const orderRes = await client.query(
      `INSERT INTO orders
        (order_number, customer_id, customer_full_name, email, phone, event_id, total_amount, currency, status, reservation_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'JOD','AWAITING_PAYMENT', now() + ($8 || ' minutes')::interval)
       RETURNING *`,
      [
        orderNumber,
        input.customerId,
        customerFullName,
        input.email.trim().toLowerCase(),
        input.phone.trim(),
        input.eventId,
        total.toFixed(2),
        reservationMinutes,
      ]
    );
    const order = orderRes.rows[0];

    for (const line of lineDetails) {
      await client.query(
        `INSERT INTO order_items (order_id, ticket_type_id, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, line.ticketTypeId, line.quantity, line.unitPrice.toFixed(2), line.subtotal.toFixed(2)]
      );
    }

    await client.query(
      `INSERT INTO payments (order_id, method, amount, currency, status)
       VALUES ($1, 'CLIQ', $2, 'JOD', 'PENDING')`,
      [order.id, total.toFixed(2)]
    );

    await client.query(
      `INSERT INTO audit_logs (order_id, action, previous_status, new_status)
       VALUES ($1, 'ORDER_CREATED', NULL, 'AWAITING_PAYMENT')`,
      [order.id]
    );

    return order as {
      id: string;
      order_number: string;
      total_amount: string;
      currency: string;
      status: string;
      reservation_expires_at: string;
    };
  });
}

/** Customer confirms they completed the CliQ transfer. Moves order into admin review. Does NOT verify payment. */
export async function submitTransferConfirmation(orderId: string) {
  return withTransaction(async (client) => {
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );
    const order = orderRes.rows[0];
    if (!order) throw new OrderError("NOT_FOUND", "Order not found.");
    if (order.status === "PAYMENT_VERIFICATION" || order.status === "PAID") {
      // Idempotent: already submitted / already paid.
      return order;
    }
    if (order.status !== "AWAITING_PAYMENT") {
      throw new OrderError(
        "INVALID_STATE",
        "This order can no longer accept a payment confirmation."
      );
    }
    if (
      order.reservation_expires_at &&
      new Date(order.reservation_expires_at).getTime() < Date.now()
    ) {
      throw new OrderError(
        "EXPIRED",
        "Your reservation has expired. Please start a new order."
      );
    }

    const updated = await client.query(
      `UPDATE orders SET status = 'PAYMENT_VERIFICATION', updated_at = now() WHERE id = $1 RETURNING *`,
      [orderId]
    );
    await client.query(
      `UPDATE payments SET status = 'AWAITING_ADMIN_REVIEW', submitted_at = now(), updated_at = now()
       WHERE order_id = $1 AND status = 'PENDING'`,
      [orderId]
    );
    await client.query(
      `INSERT INTO audit_logs (order_id, action, previous_status, new_status)
       VALUES ($1, 'TRANSFER_CONFIRMED_BY_CUSTOMER', 'AWAITING_PAYMENT', 'PAYMENT_VERIFICATION')`,
      [orderId]
    );
    return updated.rows[0];
  });
}

export async function getOrderWithDetails(orderId: string) {
  const order = await queryOne(
    `SELECT o.*, e.name as event_name, e.slug as event_slug, e.start_date, e.cover_image_url
     FROM orders o JOIN events e ON e.id = o.event_id WHERE o.id = $1`,
    [orderId]
  );
  if (!order) return null;
  const items = await query(
    `SELECT oi.*, tt.name as ticket_type_name
     FROM order_items oi JOIN ticket_types tt ON tt.id = oi.ticket_type_id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  const payment = await queryOne(`SELECT * FROM payments WHERE order_id = $1`, [
    orderId,
  ]);
  const tickets = await query(`SELECT * FROM tickets WHERE order_id = $1 ORDER BY ticket_number`, [
    orderId,
  ]);
  return { order, items, payment, tickets };
}
