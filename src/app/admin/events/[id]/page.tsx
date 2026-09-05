"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { formatJod } from "@/lib/format";

interface EventDetail {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  description: string;
}
interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: string;
  total_inventory: number;
  reserved_count: number;
  sold_count: number;
  is_active: boolean;
}

export default function AdminEventEditPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [newTier, setNewTier] = useState({ name: "", price: "", totalInventory: "" });

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${id}`);
    const data = await res.json();
    setEvent(data.event);
    setTicketTypes(data.ticketTypes ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublish() {
    if (!event) return;
    await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !event.is_published }),
    });
    load();
  }

  async function addTier(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/admin/ticket-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: id,
        name: newTier.name,
        price: Number(newTier.price),
        totalInventory: Number(newTier.totalInventory),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error?.message ?? "Could not create ticket type.");
      return;
    }
    setNewTier({ name: "", price: "", totalInventory: "" });
    load();
  }

  async function toggleActive(tt: TicketType) {
    await fetch(`/api/admin/ticket-types/${tt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tt.is_active }),
    });
    load();
  }

  async function updateInventory(tt: TicketType, value: number) {
    const res = await fetch(`/api/admin/ticket-types/${tt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalInventory: value }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error?.message ?? "Could not update inventory.");
      return;
    }
    load();
  }

  if (!event) return <p className="text-slate">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-bone">{event.name}</h1>
        <button
          onClick={togglePublish}
          className={`rounded-full px-4 py-2 text-sm ${
            event.is_published ? "border border-hairline text-slate" : "bg-emerald text-ink"
          }`}
        >
          {event.is_published ? "Unpublish" : "Publish"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate">/events/{event.slug}</p>

      {message && <p className="mt-4 text-sm text-ember">{message}</p>}

      <h2 className="mt-10 font-display text-xl text-bone">Ticket types</h2>
      <div className="mt-4 space-y-3">
        {ticketTypes.map((tt) => (
          <div key={tt.id} className="rounded-lg border border-hairline bg-ink-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-bone">{tt.name}</p>
                <p className="text-xs text-slate">{formatJod(tt.price)}</p>
              </div>
              <button
                onClick={() => toggleActive(tt)}
                className={`rounded-full px-3 py-1 text-xs ${
                  tt.is_active ? "bg-emerald/15 text-emerald" : "bg-hairline text-slate"
                }`}
              >
                {tt.is_active ? "Active" : "Disabled"}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate">
              <span>Sold: {tt.sold_count}</span>
              <span>Reserved: {tt.reserved_count}</span>
              <span>Remaining: {tt.total_inventory - tt.reserved_count - tt.sold_count}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs text-slate">Total inventory</label>
              <input
                type="number"
                defaultValue={tt.total_inventory}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v !== tt.total_inventory) updateInventory(tt, v);
                }}
                className="w-24 rounded-md border border-hairline bg-ink px-2 py-1 text-xs text-bone"
              />
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addTier} className="mt-6 rounded-lg border border-dashed border-hairline p-4">
        <p className="text-sm text-bone">Add ticket type</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <input
            required
            placeholder="Name"
            value={newTier.name}
            onChange={(e) => setNewTier((t) => ({ ...t, name: e.target.value }))}
            className="rounded-md border border-hairline bg-ink px-2 py-1.5 text-xs text-bone"
          />
          <input
            required
            type="number"
            step="0.01"
            placeholder="Price (JOD)"
            value={newTier.price}
            onChange={(e) => setNewTier((t) => ({ ...t, price: e.target.value }))}
            className="rounded-md border border-hairline bg-ink px-2 py-1.5 text-xs text-bone"
          />
          <input
            required
            type="number"
            placeholder="Inventory"
            value={newTier.totalInventory}
            onChange={(e) => setNewTier((t) => ({ ...t, totalInventory: e.target.value }))}
            className="rounded-md border border-hairline bg-ink px-2 py-1.5 text-xs text-bone"
          />
        </div>
        <button className="mt-3 w-full rounded-full bg-gold py-2 text-xs font-medium text-ink hover:bg-gold-soft">
          Add
        </button>
      </form>
    </div>
  );
}
