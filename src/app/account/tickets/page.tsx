"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEventDate } from "@/lib/format";

interface TicketRow {
  id: string;
  ticket_number: string;
  status: string;
  event_name: string;
  event_slug: string;
  start_date: string;
  venue_name: string;
  ticket_type_name: string;
  order_number: string;
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/my/tickets")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error?.message ?? "Please log in to view your tickets.");
          return;
        }
        setTickets(d.tickets);
      })
      .catch(() => setError("Something went wrong."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <div className="flex items-center gap-6 border-b border-hairline pb-4 text-sm">
        <span className="text-bone">My Tickets</span>
        <Link href="/account/orders" className="text-slate hover:text-gold">
          My Orders
        </Link>
        <Link href="/account/profile" className="text-slate hover:text-gold">
          Profile Settings
        </Link>
      </div>

      {error && (
        <p className="mt-8 text-sm text-slate">
          {error} <Link href="/login" className="text-gold hover:underline">Log in</Link>
        </p>
      )}

      {tickets && tickets.length === 0 && (
        <p className="mt-8 text-sm text-slate">
          No tickets yet. <Link href="/events" className="text-gold hover:underline">Browse events</Link>
        </p>
      )}

      <div className="mt-6 space-y-4">
        {tickets?.map((t) => (
          <div key={t.id} className="rounded-lg border border-hairline bg-ink-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/events/${t.event_slug}`} className="font-display text-lg text-bone hover:text-gold">
                  {t.event_name}
                </Link>
                <p className="text-sm text-slate">{formatEventDate(t.start_date)} · {t.venue_name}</p>
                <p className="mt-1 text-xs text-slate">{t.ticket_type_name} · {t.ticket_number} · Order {t.order_number}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    t.status === "VALID"
                      ? "bg-emerald/15 text-emerald"
                      : t.status === "USED"
                      ? "bg-hairline text-slate"
                      : "bg-ember/15 text-ember"
                  }`}
                >
                  {t.status}
                </span>
                <a
                  href={`/api/tickets/${t.id}/pdf`}
                  target="_blank"
                  rel="noopener"
                  className="rounded-full border border-gold px-4 py-1.5 text-xs text-gold hover:bg-gold hover:text-ink"
                >
                  Download PDF
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
