"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEventDate, formatJod } from "@/lib/format";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total_amount: string;
  event_name: string;
  start_date: string;
  ticket_count: string;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/my/orders")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error?.message ?? "Please log in to view your orders.");
          return;
        }
        setOrders(d.orders);
      })
      .catch(() => setError("Something went wrong."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <div className="flex items-center gap-6 border-b border-hairline pb-4 text-sm">
        <Link href="/account/tickets" className="text-slate hover:text-gold">
          My Tickets
        </Link>
        <span className="text-bone">My Orders</span>
        <Link href="/account/profile" className="text-slate hover:text-gold">
          Profile Settings
        </Link>
      </div>

      {error && (
        <p className="mt-8 text-sm text-slate">
          {error} <Link href="/login" className="text-gold hover:underline">Log in</Link>
        </p>
      )}

      <div className="mt-6 space-y-3">
        {orders?.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="flex items-center justify-between rounded-lg border border-hairline bg-ink-card p-4 hover:border-gold/50"
          >
            <div>
              <p className="text-sm text-bone">{o.order_number} · {o.event_name}</p>
              <p className="text-xs text-slate">{formatEventDate(o.start_date)} · {o.ticket_count} ticket(s)</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gold">{formatJod(o.total_amount)}</p>
              <p className="text-xs text-slate">{o.status.replace(/_/g, " ")}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
