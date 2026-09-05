import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

/**
 * Sends a transactional email. Falls back to logging in development/when no
 * SMTP_HOST is configured, so the full order/approval flow can be exercised
 * end-to-end without a real mail provider.
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.log(
      `[mailer:dev-fallback] Would send email to ${input.to} — subject: "${input.subject}" (${
        input.attachments?.length ?? 0
      } attachment(s))`
    );
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || "Afterdark.jo <no-reply@afterdark.jo>",
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  });
}

export function orderConfirmationEmail(params: {
  customerName: string;
  eventName: string;
  orderNumber: string;
  amount: string;
  currency: string;
  ticketCount: number;
  ticketsUrl: string;
}): string {
  return `
  <div style="font-family:Helvetica,Arial,sans-serif;background:#0A0A0F;padding:32px;color:#fff;">
    <h1 style="color:#D4AF37;font-size:20px;">Your tickets are confirmed 🎉</h1>
    <p>Hi ${params.customerName},</p>
    <p>Your payment for <strong>${params.eventName}</strong> has been verified. Order <strong>${params.orderNumber}</strong>
    for ${params.amount} ${params.currency} is now <strong>PAID</strong>.</p>
    <p>${params.ticketCount} individual ticket(s) have been generated, each with its own unique QR code.</p>
    <p><a href="${params.ticketsUrl}" style="color:#D4AF37;">View and download your tickets</a></p>
    <p style="color:#8A8A99;font-size:12px;">Present your PDF ticket or its QR code at the entrance. Each ticket can only be scanned once.</p>
  </div>`;
}

export function paymentRejectedEmail(params: {
  customerName: string;
  eventName: string;
  orderNumber: string;
  reason: string;
}): string {
  return `
  <div style="font-family:Helvetica,Arial,sans-serif;background:#0A0A0F;padding:32px;color:#fff;">
    <h1 style="color:#F87171;font-size:20px;">We couldn't verify your payment</h1>
    <p>Hi ${params.customerName},</p>
    <p>Unfortunately we could not verify your CliQ payment for order <strong>${params.orderNumber}</strong>
    (${params.eventName}). Reason: ${params.reason}.</p>
    <p>Please contact support if you believe this is a mistake, or place a new order.</p>
  </div>`;
}
