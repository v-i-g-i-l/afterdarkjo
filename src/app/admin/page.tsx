"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatJod, formatEventDate } from "@/lib/format";

interface Analytics {
  totalRevenue: number;
  todayRevenue: number;
  ticketsSold: number;
  availableTickets: number;
  eventCount: number;
  pendingPayments: number;
  checkedIn: number;
  totalTickets: number;
  recentOrders: {
    id: string;
    order_number: string;
    customer_full_name: string;
    total_amount: string;
    status: string;
    created_at: string;
    event_name: string;
  }[];
  revenueByDate: { date: string; revenue: string }[];
  bestSellingEvents: { name: string; tickets_sold: string; revenue: string }[];
  bestSellingTicketTypes: { name: string; tickets_sold: string }[];
}

function MiniBarChart({ data, valueKey }: { data: { date: string; revenue: string }[]; valueKey: "revenue" }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey])));
  return (
    <div className="flex h-24 items-end gap-1">
      {data.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${formatJod(d[valueKey])}`}
          style={{ height: `${(Number(d[valueKey]) / max) * 100}%` }}
          className="w-2 min-h-[2px] flex-1 rounded-t bg-gold/70"
        />
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setData(d));
  }, []);

  if (!data) return <p className="text-slate">Loading analytics…</p>;

  const metrics = [
    { label: "Total revenue", value: formatJod(data.totalRevenue) },
    { label: "Today's revenue", value: formatJod(data.todayRevenue) },
    { label: "Tickets sold", value: data.ticketsSold },
    { label: "Tickets available", value: data.availableTickets },
    { label: "Events", value: data.eventCount },
    { label: "Pending payments", value: data.pendingPayments, highlight: data.pendingPayments > 0 },
    { label: "Checked in", value: `${data.checkedIn} / ${data.totalTickets}` },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl text-bone">Dashboard</h1>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-hairline bg-ink-card p-4">
            <p className="text-xs text-slate">{m.label}</p>
            <p className={`mt-1 font-display text-2xl ${m.highlight ? "text-gold" : "text-bone"}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {data.pendingPayments > 0 && (
        <Link
          href="/admin/payments"
          className="mt-6 block rounded-lg border border-gold/50 bg-gold/10 p-4 text-sm text-gold hover:bg-gold/20"
        >
          {data.pendingPayments} payment(s) awaiting verification →
        </Link>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-ink-card p-5">
          <p className="text-sm text-bone">Revenue, last 30 days</p>
          <div className="mt-4">
            <MiniBarChart data={data.revenueByDate} valueKey="revenue" />
          </div>
        </div>
        <div className="rounded-lg border border-hairline bg-ink-card p-5">
          <p className="text-sm text-bone">Best-selling events</p>
          <div className="mt-4 space-y-2">
            {data.bestSellingEvents.map((e) => (
              <div key={e.name} className="flex justify-between text-sm">
                <span className="text-slate">{e.name}</span>
                <span className="text-gold">{e.tickets_sold} tickets</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-lg border border-hairline bg-ink-card p-5">
        <p className="text-sm text-bone">Recent orders</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate">
              <tr>
                <th className="pb-2">Order</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Event</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id} className="border-t border-hairline">
                  <td className="py-2 text-bone">{o.order_number}</td>
                  <td className="py-2 text-slate">{o.customer_full_name}</td>
                  <td className="py-2 text-slate">{o.event_name}</td>
                  <td className="py-2 text-gold">{formatJod(o.total_amount)}</td>
                  <td className="py-2 text-slate">{o.status.replace(/_/g, " ")}</td>
                  <td className="py-2 text-slate">{formatEventDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
