"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/useSession";

export function SiteHeader() {
  const session = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="font-display text-xl tracking-wide text-bone">
          Afterdark<span className="text-gold">.jo</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate md:flex">
          <Link href="/events" className="hover:text-bone transition-colors">
            Events
          </Link>
          <Link href="/#categories" className="hover:text-bone transition-colors">
            Categories
          </Link>
          <Link href="/#about" className="hover:text-bone transition-colors">
            About
          </Link>
          {session === undefined ? null : session === null ? (
            <>
              <Link href="/login" className="hover:text-bone transition-colors">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-gold px-4 py-1.5 text-gold hover:bg-gold hover:text-ink transition-colors"
              >
                Sign up
              </Link>
              <Link
                href="/admin"
                className="rounded-full border border-hairline px-4 py-1.5 text-xs text-slate hover:border-gold hover:text-gold transition-colors"
              >
                Admin login
              </Link>
            </>
          ) : (
            <>
              {session.role === "ADMIN" && (
                <Link href="/admin" className="hover:text-bone transition-colors">
                  Admin
                </Link>
              )}
              {session.role === "STAFF" && (
                <Link href="/staff/scan" className="hover:text-bone transition-colors">
                  Scan
                </Link>
              )}
              <Link href="/account/tickets" className="hover:text-bone transition-colors">
                My Tickets
              </Link>
              <button onClick={handleLogout} className="hover:text-bone transition-colors">
                Log out
              </button>
            </>
          )}
        </nav>

        <button
          aria-label="Toggle menu"
          className="md:hidden text-bone"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-hairline px-5 py-4 flex flex-col gap-4 text-sm text-slate">
          <Link href="/events" onClick={() => setMenuOpen(false)}>
            Events
          </Link>
          {session === null && (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                Log in
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                Sign up
              </Link>
              <Link href="/admin" onClick={() => setMenuOpen(false)}>
                Admin login
              </Link>
            </>
          )}
          {session && session.role === "ADMIN" && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}>
              Admin
            </Link>
          )}
          {session && session.role === "STAFF" && (
            <Link href="/staff/scan" onClick={() => setMenuOpen(false)}>
              Scan
            </Link>
          )}
          {session && (
            <>
              <Link href="/account/tickets" onClick={() => setMenuOpen(false)}>
                My Tickets
              </Link>
              <button className="text-left" onClick={handleLogout}>
                Log out
              </button>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
