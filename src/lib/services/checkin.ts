import { withTransaction, queryOne } from "@/lib/db";

export type CheckInResult =
  | { outcome: "INVALID"; reason: string }
  | {
      outcome: "VALID_CHECKED_IN";
      ticket: Record<string, unknown>;
    }
  | {
      outcome: "ALREADY_USED";
      ticket: Record<string, unknown>;
      firstCheckIn: Record<string, unknown> | null;
    };

async function lookupTicket(client: import("pg").PoolClient, identifier: string) {
  // Accept either a raw qr_token (from a scanned QR) or a human ticket number
  // (for manual entry by staff).
  const res = await client.query(
    `SELECT t.*, e.name as event_name, e.start_date, v.name as venue_name,
            tt.name as ticket_type_name
     FROM tickets t
     JOIN events e ON e.id = t.event_id
     JOIN venues v ON v.id = e.venue_id
     JOIN ticket_types tt ON tt.id = t.ticket_type_id
     WHERE t.qr_token = $1 OR t.ticket_number = $1
     FOR UPDATE`,
    [identifier]
  );
  return res.rows[0] as Record<string, unknown> | undefined;
}

/**
 * Verifies + checks in a ticket atomically. The UPDATE below only succeeds
 * if the ticket is still VALID at the moment it executes, so if two staff
 * members scan the same QR code at the same instant, the database guarantees
 * only one request can flip VALID -> USED; the loser sees ALREADY_USED.
 */
export async function verifyAndCheckIn(
  identifier: string,
  staffId: string | null,
  location?: string
): Promise<CheckInResult> {
  return withTransaction(async (client) => {
    const ticket = await lookupTicket(client, identifier.trim());
    if (!ticket) {
      return { outcome: "INVALID", reason: "No ticket matches this code." };
    }

    if (ticket.status === "CANCELLED" || ticket.status === "REFUNDED") {
      return {
        outcome: "INVALID",
        reason: `This ticket has been ${String(ticket.status).toLowerCase()}.`,
      };
    }

    if (ticket.status === "USED") {
      const firstCheckIn = await client.query(
        `SELECT ci.*, u.full_name as staff_name FROM check_ins ci
         LEFT JOIN users u ON u.id = ci.staff_id
         WHERE ci.ticket_id = $1 AND ci.result = 'VALID_CHECKED_IN'
         ORDER BY ci.created_at ASC LIMIT 1`,
        [ticket.id]
      );
      await client.query(
        `INSERT INTO check_ins (ticket_id, staff_id, result, location)
         VALUES ($1,$2,'ALREADY_USED',$3)`,
        [ticket.id, staffId, location ?? null]
      );
      return {
        outcome: "ALREADY_USED",
        ticket,
        firstCheckIn: firstCheckIn.rows[0] ?? null,
      };
    }

    // status === 'VALID' -> attempt the atomic transition.
    const updated = await client.query(
      `UPDATE tickets SET status = 'USED', used_at = now(), checked_in_by_id = $2
       WHERE id = $1 AND status = 'VALID'
       RETURNING *`,
      [ticket.id, staffId]
    );

    if (!updated.rows[0]) {
      // Lost the race to another concurrent scan; report ALREADY_USED.
      const firstCheckIn = await client.query(
        `SELECT ci.*, u.full_name as staff_name FROM check_ins ci
         LEFT JOIN users u ON u.id = ci.staff_id
         WHERE ci.ticket_id = $1 AND ci.result = 'VALID_CHECKED_IN'
         ORDER BY ci.created_at ASC LIMIT 1`,
        [ticket.id]
      );
      await client.query(
        `INSERT INTO check_ins (ticket_id, staff_id, result, location) VALUES ($1,$2,'ALREADY_USED',$3)`,
        [ticket.id, staffId, location ?? null]
      );
      return {
        outcome: "ALREADY_USED",
        ticket,
        firstCheckIn: firstCheckIn.rows[0] ?? null,
      };
    }

    await client.query(
      `INSERT INTO check_ins (ticket_id, staff_id, result, location) VALUES ($1,$2,'VALID_CHECKED_IN',$3)`,
      [ticket.id, staffId, location ?? null]
    );

    return { outcome: "VALID_CHECKED_IN", ticket: { ...ticket, ...updated.rows[0] } };
  });
}

export async function getTicketPublicStatus(identifier: string) {
  return queryOne(
    `SELECT t.ticket_number, t.status, t.customer_name, e.name as event_name,
            e.start_date, tt.name as ticket_type_name
     FROM tickets t
     JOIN events e ON e.id = t.event_id
     JOIN ticket_types tt ON tt.id = t.ticket_type_id
     WHERE t.qr_token = $1 OR t.ticket_number = $1`,
    [identifier.trim()]
  );
}
