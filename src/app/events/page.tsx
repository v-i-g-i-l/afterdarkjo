import { query } from "@/lib/db";
import { EventCard, type EventCardData } from "@/components/EventCard";
import { EventFilters } from "@/components/EventFilters";

export const metadata = { title: "Events" };

interface SearchParams {
  q?: string;
  category?: string;
  city?: string;
  sort?: string;
  page?: string;
}

async function getEvents(sp: SearchParams) {
  const conditions: string[] = ["e.is_published = TRUE"];
  const params: unknown[] = [];

  if (sp.q) {
    params.push(`%${sp.q.toLowerCase()}%`);
    conditions.push(`(lower(e.name) LIKE $${params.length} OR lower(v.city) LIKE $${params.length})`);
  }
  if (sp.category) {
    params.push(sp.category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (sp.city) {
    params.push(sp.city);
    conditions.push(`v.city = $${params.length}`);
  }
  const orderBy =
    sp.sort === "date_desc"
      ? "e.start_date DESC"
      : sp.sort === "price_asc"
      ? "min_price ASC NULLS LAST"
      : sp.sort === "price_desc"
      ? "min_price DESC NULLS LAST"
      : "e.start_date ASC";

  const where = conditions.join(" AND ");
  const events = await query<EventCardData>(
    `SELECT e.slug, e.name, e.cover_image_url, e.start_date, v.name as venue_name, v.city as venue_city,
            c.name as category_name,
            (SELECT MIN(price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active) as min_price,
            (SELECT COALESCE(SUM(total_inventory - reserved_count - sold_count), 0) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active) as remaining
     FROM events e JOIN venues v ON v.id = e.venue_id JOIN categories c ON c.id = e.category_id
     WHERE ${where}
     ORDER BY ${orderBy}`,
    params
  );
  const categories = await query<{ name: string; slug: string }>(
    `SELECT name, slug FROM categories ORDER BY name`
  );
  const cities = await query<{ city: string }>(
    `SELECT DISTINCT city FROM venues ORDER BY city`
  );
  return { events, categories, cities: cities.map((c) => c.city) };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { events, categories, cities } = await getEvents(sp);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-3xl text-bone sm:text-4xl">All events</h1>
      <p className="mt-2 text-sm text-slate">{events.length} event{events.length === 1 ? "" : "s"} on sale</p>

      <div className="mt-8">
        <EventFilters categories={categories} cities={cities} current={sp} />
      </div>

      {events.length === 0 ? (
        <div className="mt-16 rounded-lg border border-hairline bg-ink-card px-6 py-16 text-center">
          <p className="font-display text-xl text-bone">No events match your filters</p>
          <p className="mt-2 text-sm text-slate">Try clearing a filter or check back soon — we add nights every week.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
