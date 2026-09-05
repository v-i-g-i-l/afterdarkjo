"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { formatEventDate, formatJod } from "@/lib/format";

interface OrderDetails {
  order: {
    id: string;
    order_number: string;
    customer_full_name: string;
    email: string;
    phone: string;
    total_amount: string;
    currency: string;
    status: string;
    reservation_expires_at: string | null;
    event_name: string;
    start_date: string;
  };
  items: { ticket_type_name: string; quantity: number; subtotal: string }[];
  payment: { status: string } | null;
  tickets: { id: string; ticket_number: string; ticket_type_id: string; status: string }[];
  settings: { business_name: string; cliq_alias: string; payment_instructions: string; support_phone: string; support_email: string };
}

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? "Order not found.");
      return;
    }
    setData(json);
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000); // poll for admin approval
    return () => clearInterval(interval);
  }, [load]);

  async function handleConfirmTransfer() {
    setConfirming(true);
    const res = await fetch(`/api/orders/${id}/confirm-transfer`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? "Could not submit confirmation.");
    }
    setConfirming(false);
    load();
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="font-display text-2xl text-bone">Something's not right</p>
        <p className="mt-3 text-sm text-slate">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center text-slate">Loading order…</div>
    );
  }

  const { order, items, tickets, settings } = data;

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
      <p className="text-xs tracking-wide text-slate">ORDER {order.order_number}</p>
      <h1 className="mt-2 font-display text-3xl text-bone">{order.event_name}</h1>
      <p className="mt-1 text-sm text-slate">{formatEventDate(order.start_date)}</p>

      <div className="mt-8 rounded-lg border border-hairline bg-ink-card p-6">
        <p className="text-sm text-bone">{order.customer_full_name}</p>
        {items.map((line, i) => (
          <p key={i} className="mt-1 text-sm text-slate">
            {line.quantity} × {line.ticket_type_name} — {formatJod(line.subtotal)}
          </p>
        ))}
        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
          <span className="text-sm text-slate">Total</span>
          <span className="text-lg text-gold">{formatJod(order.total_amount)}</span>
        </div>
      </div>

      {order.status === "AWAITING_PAYMENT" && (
        <div className="mt-8 rounded-lg border border-gold/40 bg-ink-card p-6">
          <p className="font-display text-lg text-bone">Pay via CliQ</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate">Amount</dt>
              <dd className="text-bone">{formatJod(order.total_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">CliQ Alias</dt>
              <dd className="font-mono text-gold">{settings.cliq_alias}</dd>
            </div>
          </dl>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate">
            <li>Open your banking application.</li>
            <li>Transfer the exact amount using CliQ.</li>
            <li>Send the payment to the official business CliQ alias above.</li>
            <li>Complete the transfer.</li>
            <li>Return to this page and confirm below.</li>
          </ol>
          {order.reservation_expires_at && (
            <p className="mt-3 text-xs text-ember">
              Your reservation holds until {new Date(order.reservation_expires_at).toLocaleTimeString()}.
              Complete payment before it expires.
            </p>
          )}
          <button
            onClick={handleConfirmTransfer}
            disabled={confirming}
            className="mt-6 w-full rounded-full bg-gold py-3 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50"
          >
            {confirming ? "Submitting…" : "I Have Completed the Transfer"}
          </button>
        </div>
      )}

      {order.status === "PAYMENT_VERIFICATION" && (
        <div className="mt-8 rounded-lg border border-hairline bg-ink-card p-6 text-center">
          <p className="font-display text-lg text-bone">Awaiting verification</p>
          <p className="mt-2 text-sm text-slate">
            Your payment confirmation has been submitted. Your order is waiting for payment
            verification. Your ticket will be issued after your payment is verified.
          </p>
        </div>
      )}

      {order.status === "PAID" && (
        <div className="mt-8">
          <div className="rounded-lg border border-emerald/40 bg-ink-card p-6 text-center">
            <p className="font-display text-lg text-emerald">Payment verified — tickets issued</p>
          </div>
          <div className="mt-4 space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-hairline bg-ink-card p-4">
                <div>
                  <p className="text-sm text-bone">{t.ticket_number}</p>
                  <p className="text-xs text-slate">Status: {t.status}</p>
                </div>
                <a
                  href={`/api/tickets/${t.id}/pdf`}
                  target="_blank"
                  rel="noopener"
                  className="rounded-full border border-gold px-4 py-1.5 text-xs text-gold hover:bg-gold hover:text-ink"
                >
                  Download PDF
                </a>
              </div>
            ))}
          </div>
          {tickets.length > 1 && (
            <a
              href={`/api/orders/${order.id}/tickets-zip`}
              className="mt-4 block w-full rounded-full border border-hairline py-3 text-center text-sm text-bone hover:border-gold"
            >
              Download all tickets (ZIP)
            </a>
          )}
        </div>
      )}

      {order.status === "PAYMENT_REJECTED" && (
        <div className="mt-8 rounded-lg border border-ember/40 bg-ink-card p-6 text-center">
          <p className="font-display text-lg text-ember">Payment could not be verified</p>
          <p className="mt-2 text-sm text-slate">
            We could not confirm your CliQ payment for this order. Please contact support at{" "}
            {settings.support_email} or {settings.support_phone}.
          </p>
        </div>
      )}

      {order.status === "EXPIRED" && (
        <div className="mt-8 rounded-lg border border-ember/40 bg-ink-card p-6 text-center">
          <p className="font-display text-lg text-ember">Reservation expired</p>
          <p className="mt-2 text-sm text-slate">
            This order&apos;s reservation window elapsed before payment was confirmed. Please start a new order.
          </p>
        </div>
      )}
    </div>
  );
}
