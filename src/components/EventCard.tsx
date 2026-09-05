import Link from "next/link";
import { formatEventDate, formatJod } from "@/lib/format";

export interface EventCardData {
  slug: string;
  name: string;
  cover_image_url: string | null;
  start_date: string;
  venue_name: string;
  venue_city: string;
  category_name?: string;
  min_price: string | number | null;
  remaining: string | number | null;
}

export function EventCard({ event }: { event: EventCardData }) {
  const soldOut = Number(event.remaining ?? 0) <= 0;
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block overflow-hidden rounded-lg border border-hairline bg-ink-card transition-colors hover:border-gold/50"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink-raised">
        {event.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt={event.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate">No image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
        {soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-ember/90 px-3 py-1 text-xs tracking-wide text-bone">
            Sold out
          </span>
        )}
        {event.category_name && (
          <span className="absolute left-3 top-3 rounded-full border border-bone/20 bg-ink/60 px-3 py-1 text-xs text-bone backdrop-blur-sm">
            {event.category_name}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-display text-xl leading-tight text-bone">{event.name}</p>
          <p className="mt-1 text-sm text-slate">{event.venue_name}, {event.venue_city}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span className="text-slate">{formatEventDate(event.start_date)}</span>
        <span className="text-gold">
          {event.min_price != null ? `From ${formatJod(event.min_price)}` : "—"}
        </span>
      </div>
    </Link>
  );
}
