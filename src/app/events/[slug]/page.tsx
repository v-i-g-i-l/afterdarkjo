import { notFound } from "next/navigation";
import { queryOne, query } from "@/lib/db";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { TicketSelector } from "@/components/TicketSelector";

interface EventRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  rules: string | null;
  age_restriction: string | null;
  dress_code: string | null;
  cover_image_url: string | null;
  start_date: string;
  end_date: string;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  category_name: string;
}

interface TicketTypeRow {
  id: string;
  name: string;
  description: string | null;
  price: string;
  remaining: number;
  total_inventory: number;
}

async function getEvent(slug: string) {
  const event = await queryOne<EventRow>(
    `SELECT e.*, v.name as venue_name, v.address as venue_address, v.city as venue_city, c.name as category_name
     FROM events e JOIN venues v ON v.id = e.venue_id JOIN categories c ON c.id = e.category_id
     WHERE e.slug = $1 AND e.is_published = TRUE`,
    [slug]
  );
  if (!event) return null;
  const ticketTypes = await query<TicketTypeRow>(
    `SELECT id, name, description, price,
            (total_inventory - reserved_count - sold_count) as remaining, total_inventory
     FROM ticket_types WHERE event_id = $1 AND is_active = TRUE ORDER BY sort_order, price`,
    [event.id]
  );
  return { event, ticketTypes };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getEvent(slug);
  if (!data) return {};
  return {
    title: data.event.name,
    description: data.event.description.slice(0, 150),
    openGraph: {
      title: data.event.name,
      description: data.event.description.slice(0, 150),
      images: data.event.cover_image_url ? [data.event.cover_image_url] : [],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEvent(slug);
  if (!data) notFound();
  const { event, ticketTypes } = data;

  return (
    <div>
      <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden border-b border-hairline">
        {event.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_image_url} alt={event.name} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-8 sm:px-8">
          <p className="text-xs tracking-[0.2em] text-gold">{event.category_name.toUpperCase()}</p>
          <h1 className="mt-2 font-display text-3xl text-bone sm:text-5xl">{event.name}</h1>
          <p className="mt-2 text-sm text-slate sm:text-base">
            {formatEventDate(event.start_date)} · {formatEventTime(event.start_date)} · {event.venue_name}, {event.venue_city}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_380px]">
        <div>
          <section>
            <h2 className="font-display text-xl text-bone">About this night</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate">{event.description}</p>
          </section>

          <section className="mt-10 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs tracking-wide text-slate">Venue</p>
              <p className="mt-1 text-sm text-bone">{event.venue_name}</p>
              <p className="text-sm text-slate">{event.venue_address}, {event.venue_city}</p>
            </div>
            <div>
              <p className="text-xs tracking-wide text-slate">Age restriction</p>
              <p className="mt-1 text-sm text-bone">{event.age_restriction || "All ages welcome"}</p>
            </div>
            {event.dress_code && (
              <div>
                <p className="text-xs tracking-wide text-slate">Dress code</p>
                <p className="mt-1 text-sm text-bone">{event.dress_code}</p>
              </div>
            )}
            {event.rules && (
              <div>
                <p className="text-xs tracking-wide text-slate">House rules</p>
                <p className="mt-1 text-sm text-bone">{event.rules}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <TicketSelector
            eventId={event.id}
            eventName={event.name}
            ticketTypes={ticketTypes}
          />
        </aside>
      </div>
    </div>
  );
}
