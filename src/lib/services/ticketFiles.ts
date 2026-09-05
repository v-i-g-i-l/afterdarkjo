import fs from "fs/promises";
import path from "path";
import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import { queryOne, query } from "@/lib/db";
import { renderTicketPdf } from "@/lib/services/ticketPdf";

// Ticket PDFs are private application storage (not under /public), served
// only through an authenticated route handler that checks ownership.
const STORAGE_DIR = path.join(process.cwd(), "storage", "tickets");

async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

function pdfPathFor(ticketNumber: string) {
  return path.join(/tmp/tickets, `${ticketNumber}.pdf`);
}

interface TicketRow {
  id: string;
  ticket_number: string;
  qr_token: string;
  customer_name: string;
  status: "VALID" | "USED" | "CANCELLED" | "REFUNDED";
  order_id: string;
  ticket_type_name: string;
  event_name: string;
  start_date: string;
  venue_name: string;
  venue_city: string;
  order_number: string;
}

async function fetchTicketRow(ticketId: string): Promise<TicketRow | null> {
  return queryOne<TicketRow>(
    `SELECT t.id, t.ticket_number, t.qr_token, t.customer_name, t.status, t.order_id,
            tt.name as ticket_type_name, e.name as event_name, e.start_date,
            v.name as venue_name, v.city as venue_city, o.order_number
     FROM tickets t
     JOIN ticket_types tt ON tt.id = t.ticket_type_id
     JOIN events e ON e.id = t.event_id
     JOIN venues v ON v.id = e.venue_id
     JOIN orders o ON o.id = t.order_id
     WHERE t.id = $1`,
    [ticketId]
  );
}

/** Generates (or returns cached) PDF bytes for one ticket. */
export async function getOrCreateTicketPdf(ticketId: string): Promise<Buffer> {
  const row = await fetchTicketRow(ticketId);
  if (!row) throw new Error("Ticket not found");

  await ensureDir();
  const filePath = pdfPathFor(row.ticket_number);
  try {
    return await fs.readFile(filePath);
  } catch {
    // not cached yet, generate below
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const pdf = await renderTicketPdf({
    eventName: row.event_name,
    eventDate: new Date(row.start_date),
    venueName: row.venue_name,
    venueCity: row.venue_city,
    ticketTypeName: row.ticket_type_name,
    customerName: row.customer_name,
    ticketNumber: row.ticket_number,
    orderNumber: row.order_number,
    qrToken: row.qr_token,
    appUrl,
    status: row.status,
  });

  await fs.writeFile(filePath, pdf);
  await query(`UPDATE tickets SET pdf_path = $1 WHERE id = $2`, [
    filePath,
    ticketId,
  ]);
  return pdf;
}

/** Builds a ZIP archive of all tickets belonging to an order. */
export async function zipTicketsForOrder(orderId: string): Promise<Buffer> {
  const tickets = await query<{ id: string; ticket_number: string }>(
    `SELECT id, ticket_number FROM tickets WHERE order_id = $1 ORDER BY ticket_number`,
    [orderId]
  );

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const passthrough = new PassThrough();
  const chunks: Buffer[] = [];
  passthrough.on("data", (c) => chunks.push(c));

  const donePromise = new Promise<Buffer>((resolve, reject) => {
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    passthrough.on("error", reject);
  });

  archive.pipe(passthrough);

  for (const t of tickets) {
    const pdf = await getOrCreateTicketPdf(t.id);
    archive.append(pdf, { name: `${t.ticket_number}.pdf` });
  }
  await archive.finalize();

  return donePromise;
}
