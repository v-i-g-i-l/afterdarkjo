"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function EventFilters({
  categories,
  cities,
  current,
}: {
  categories: { name: string; slug: string }[];
  cities: string[];
  current: { q?: string; category?: string; city?: string; sort?: string };
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/events?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <input
        defaultValue={current.q}
        onKeyDown={(e) => {
          if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
        }}
        placeholder="Search events or cities…"
        className="w-full max-w-xs rounded-full border border-hairline bg-ink-card px-4 py-2 text-sm text-bone placeholder:text-slate focus:border-gold sm:w-64"
      />
      <select
        value={current.category ?? ""}
        onChange={(e) => update("category", e.target.value)}
        className="rounded-full border border-hairline bg-ink-card px-4 py-2 text-sm text-bone focus:border-gold"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={current.city ?? ""}
        onChange={(e) => update("city", e.target.value)}
        className="rounded-full border border-hairline bg-ink-card px-4 py-2 text-sm text-bone focus:border-gold"
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={current.sort ?? "date_asc"}
        onChange={(e) => update("sort", e.target.value)}
        className="rounded-full border border-hairline bg-ink-card px-4 py-2 text-sm text-bone focus:border-gold"
      >
        <option value="date_asc">Soonest first</option>
        <option value="date_desc">Latest first</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </select>
    </div>
  );
}
