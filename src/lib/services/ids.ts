import crypto from "crypto";

/** Human-readable order number: ORD-2026-000001-A1B2 (random suffix avoids collisions; DB still enforces UNIQUE). */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  const millis = Date.now().toString().slice(-6);
  return `ORD-${year}-${millis}${rand.slice(0, 3)}`;
}

/** Cryptographically secure 256-bit random token used as the QR verification secret. Never derived from ticket/customer data. */
export function generateQrToken(): string {
  return crypto.randomBytes(32).toString("hex"); // 256 bits, 64 hex chars
}

export function formatTicketNumber(n: number): string {
  return `TKT-${String(n).padStart(6, "0")}`;
}
