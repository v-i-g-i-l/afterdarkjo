import Link from "next/link";
import { query } from "@/lib/db";
import { EventCard, type EventCardData } from "@/components/EventCard";

export const revalidate = 30;

async function getHomeData() {
  const featured = await query<EventCardData>(
    `SELECT e.slug, e.name, e.cover_image_url, e.start_date, v.name as venue_name, v.city as venue_city,
            c.name as category_name,
            (SELECT MIN(price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active) as min_price,
            (SELECT COALESCE(SUM(total_inventory - reserved_count - sold_count), 0) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active) as remaining
     FROM events e JOIN venues v ON v.id = e.venue_id JOIN categories c ON c.id = e.category_id
     WHERE e.is_published = TRUE ORDER BY e.start_date ASC LIMIT 3`
  );
  const upcoming = await query<EventCardData>(
    `SELECT e.slug, e.name, e.cover_image_url, e.start_date, v.name as venue_name, v.city as venue_city,
            c.name as category_name,
            (SELECT MIN(price) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active) as min_price,
            (SELECT COALESCE(SUM(total_inventory - reserved_count - sold_count), 0) FROM ticket_types tt WHERE tt.event_id = e.id AND tt.is_active) as remaining
     FROM events e JOIN venues v ON v.id = e.venue_id JOIN categories c ON c.id = e.category_id
     WHERE e.is_published = TRUE ORDER BY e.start_date ASC LIMIT 8`
  );
  const categories = await query<{ name: string; slug: string; count: string }>(
    `SELECT c.name, c.slug, COUNT(e.id) as count FROM categories c
     LEFT JOIN events e ON e.category_id = c.id AND e.is_published = TRUE
     GROUP BY c.id ORDER BY count DESC`
  );
  const hero = featured[0];
  return { featured, upcoming, categories, hero };
}

export default async function HomePage() {
  const { featured, upcoming, categories, hero } = await getHomeData();

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-hairline">
        {hero?.cover_image_url && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.cover_image_url} alt="" className="h-full w-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/40 to-transparent" />
          </div>
        )}
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-32">
          <p className="text-xs tracking-[0.2em] text-gold">JORDAN'S NIGHTLIFE, TICKETED PROPERLY</p>
          <h1 className="mt-5 max-w-2xl font-display text-4xl leading-[1.1] text-bone sm:text-6xl">
            The night starts with the door on your phone.
          </h1>
          <p className="mt-6 max-w-lg text-base text-slate sm:text-lg">
            Rooftop sessions, warehouse nights, beachfront festivals — browse what&apos;s on,
            reserve your ticket, pay by CliQ, and walk in on a QR code that only works once.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/events"
              className="rounded-full bg-gold px-7 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-soft"
            >
              Explore Events
            </Link>
            {hero && (
              <Link href={`/events/${hero.slug}`} className="text-sm text-bone underline underline-offset-4 hover:text-gold">
                This week: {hero.name}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl text-bone sm:text-3xl">Featured this month</h2>
            <Link href="/events" className="text-sm text-slate hover:text-gold">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      <section id="categories" className="border-y border-hairline bg-ink-raised/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="font-display text-2xl text-bone sm:text-3xl">Find your scene</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/events?category=${c.slug}`}
                className="rounded-lg border border-hairline px-5 py-6 text-center transition-colors hover:border-gold/60 hover:text-gold"
              >
                <p className="font-display text-lg">{c.name}</p>
                <p className="mt-1 text-xs text-slate">{c.count} event{c.count === "1" ? "" : "s"}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl text-bone sm:text-3xl">Upcoming</h2>
          <Link href="/events" className="text-sm text-slate hover:text-gold">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      </section>

      {/* WHY US */}
      <section className="border-t border-hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-3 sm:px-8">
          {[
            {
              title: "Every ticket, individually verified",
              body: "Each ticket carries its own sequential number and its own cryptographically unique QR code — never shared, never duplicated.",
            },
            {
              title: "Payments checked by a person",
              body: "No auto-approval. Our team confirms every CliQ transfer against the business account before a single ticket is issued.",
            },
            {
              title: "One scan, one entry",
              body: "The door system flips a ticket from valid to used the instant it's scanned — a second scan is caught immediately.",
            },
          ].map((item) => (
            <div key={item.title}>
              <p className="font-display text-lg text-gold">{item.title}</p>
              <p className="mt-2 text-sm text-slate">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="rounded-2xl border border-hairline bg-ink-card px-6 py-10 sm:px-12 sm:py-14">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-2xl text-bone">Don&apos;t miss the next one.</p>
              <p className="mt-2 text-sm text-slate">One email a week. No spam, just the door list.</p>
            </div>
            <form className="flex w-full max-w-sm gap-2 sm:w-auto" action="/api/newsletter" method="post">
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-full border border-hairline bg-ink px-4 py-2.5 text-sm text-bone placeholder:text-slate focus:border-gold"
              />
              <button className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-ink hover:bg-gold-soft">
                Join
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
