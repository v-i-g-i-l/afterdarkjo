"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEventDate } from "@/lib/format";

interface EventRow {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  start_date: string;
  venue_name: string;
  category_name: string;
  tickets_sold: string;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-bone">Events</h1>
        <Link href="/admin/events/new" className="rounded-full bg-gold px-5 py-2 text-sm text-ink hover:bg-gold-soft">
          + New event
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {events?.map((e) => (
          <Link
            key={e.id}
            href={`/admin/events/${e.id}`}
            className="flex items-center justify-between rounded-lg border border-hairline bg-ink-card p-4 hover:border-gold/50"
          >
            <div>
              <p className="text-sm text-bone">{e.name}</p>
              <p className="text-xs text-slate">
                {formatEventDate(e.start_date)} · {e.venue_name} · {e.category_name}
              </p>
            </div>
            <div className="text-right">
              <span className={`rounded-full px-3 py-1 text-xs ${e.is_published ? "bg-emerald/15 text-emerald" : "bg-hairline text-slate"}`}>
                {e.is_published ? "Published" : "Draft"}
              </span>
              <p className="mt-1 text-xs text-slate">{e.tickets_sold} sold</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
