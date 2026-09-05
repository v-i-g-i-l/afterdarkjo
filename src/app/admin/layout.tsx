"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/useSession";
import { InlineLoginForm } from "@/components/InlineLoginForm";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/payments", label: "Payment Verification" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const pathname = usePathname();

  if (session === undefined) {
    return <div className="px-8 py-24 text-center text-slate">Loading…</div>;
  }
  if (session === null || session.role !== "ADMIN") {
    return (
      <InlineLoginForm
        title="Admin log in"
        description="Log in with your administrator username (email) and password to continue."
        requiredRoles={["ADMIN"]}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <nav className="mb-8 flex flex-wrap gap-2 border-b border-hairline pb-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-4 py-1.5 text-sm ${
              pathname === l.href ? "bg-gold text-ink" : "text-slate hover:text-bone"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
