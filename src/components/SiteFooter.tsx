import Link from "next/link";

export function SiteFooter() {
  return (
    <footer id="about" className="border-t border-hairline mt-24">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-lg text-bone">
              Afterdark<span className="text-gold">.jo</span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-slate">
              Jordan&apos;s door to the nights worth remembering — rooftop sessions, warehouse
              raves and beachfront festivals, ticketed and verified.
            </p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-slate">Explore</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/events" className="hover:text-gold transition-colors">All events</Link></li>
              <li><Link href="/events?category=electronic" className="hover:text-gold transition-colors">Electronic</Link></li>
              <li><Link href="/events?category=rooftop" className="hover:text-gold transition-colors">Rooftop</Link></li>
              <li><Link href="/events?category=festival" className="hover:text-gold transition-colors">Festivals</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs tracking-wide text-slate">Support</p>
            <ul className="mt-3 space-y-2 text-sm text-slate">
              <li>Payments settle via CliQ, verified by our team.</li>
              <li>Need help with an order? Reach support from your ticket email.</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-hairline pt-6 text-xs text-slate sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Afterdark.jo. All rights reserved.</p>
          <p>Prices shown in JOD. All sales verified manually before ticket issuance.</p>
        </div>
      </div>
    </footer>
  );
}
