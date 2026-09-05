"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
}
interface Venue {
  id: string;
  name: string;
  city: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    rules: "",
    ageRestriction: "",
    dressCode: "",
    coverImageUrl: "",
    categoryId: "",
    venueId: "",
    startDate: "",
    endDate: "",
    isPublished: false,
  });

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories));
    fetch("/api/admin/venues").then((r) => r.json()).then((d) => setVenues(d.venues));
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Could not create event.");
      return;
    }
    router.push(`/admin/events/${data.event.id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl text-bone">New event</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs text-slate">Event name</label>
          <input
            required
            value={form.name}
            onChange={(e) => {
              update("name", e.target.value);
              if (!form.slug) update("slug", slugify(e.target.value));
            }}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs text-slate">URL slug</label>
          <input
            required
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs text-slate">Description</label>
          <textarea
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone focus:border-gold"
            rows={4}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate">Category</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate">Venue</label>
            <select
              required
              value={form.venueId}
              onChange={(e) => update("venueId", e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
            >
              <option value="">Select…</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}, {v.city}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate">Start date/time</label>
            <input
              required
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
            />
          </div>
          <div>
            <label className="text-xs text-slate">End date/time</label>
            <input
              required
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate">Cover image URL</label>
          <input
            value={form.coverImageUrl}
            onChange={(e) => update("coverImageUrl", e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate">Age restriction</label>
            <input
              value={form.ageRestriction}
              onChange={(e) => update("ageRestriction", e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
            />
          </div>
          <div>
            <label className="text-xs text-slate">Dress code</label>
            <input
              value={form.dressCode}
              onChange={(e) => update("dressCode", e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate">House rules</label>
          <textarea
            value={form.rules}
            onChange={(e) => update("rules", e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
            rows={2}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => update("isPublished", e.target.checked)}
          />
          Publish immediately
        </label>

        {error && <p className="text-sm text-ember">{error}</p>}
        <button
          disabled={saving}
          className="w-full rounded-full bg-gold py-3 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create event"}
        </button>
      </form>
    </div>
  );
}
