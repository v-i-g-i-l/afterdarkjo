"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatJod } from "@/lib/format";
import { useSession } from "@/lib/useSession";

interface TicketTypeRow {
  id: string;
  name: string;
  description: string | null;
  price: string;
  remaining: number;
  total_inventory: number;
}

export function TicketSelector({
  eventId,
  eventName,
  ticketTypes,
}: {
  eventId: string;
  eventName: string;
  ticketTypes: TicketTypeRow[];
}) {
  const router = useRouter();
  const session = useSession();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [step, setStep] = useState<"select" | "details">("select");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);

  // If the customer is signed in, pull their saved name/email/phone once so
  // they never have to retype it at checkout — they only entered it the one
  // time they registered.
  useEffect(() => {
    if (session === undefined) return; // still loading
    if (session === null || session.role !== "CUSTOMER") {
      setProfileLoaded(true);
      return;
    }
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setFullName(d.profile.full_name ?? "");
          setEmail(d.profile.email ?? "");
          setPhone(d.profile.phone ?? "");
        }
      })
      .finally(() => setProfileLoaded(true));
  }, [session]);

  const isSignedInCustomer = session && session.role === "CUSTOMER";

  const lines = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
    [quantities]
  );

  const total = useMemo(() => {
    return lines.reduce((sum, line) => {
      const tt = ticketTypes.find((t) => t.id === line.ticketTypeId);
      return sum + (tt ? Number(tt.price) * line.quantity : 0);
    }, 0);
  }, [lines, ticketTypes]);

  function setQty(id: string, qty: number, max: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, Math.min(qty, max)) }));
  }

  function validateThreePartName(name: string): boolean {
    const parts = name.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
    return parts.length >= 3;
  }

  async function handleSubmit() {
    setError(null);
    if (!lines.length) {
      setError("Select at least one ticket.");
      return;
    }
    if (!validateThreePartName(fullName)) {
      setError("Please enter your full three-part name exactly as it should appear on your ticket.");
      return;
    }
    if (!email || !phone) {
      setError("Please provide both an email and a phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, customerFullName: fullName, email, phone, lines }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/orders/${data.order.id}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-hairline bg-ink-card p-6">
      <p className="font-display text-lg text-bone">Tickets</p>

      {step === "select" && (
        <>
          <div className="mt-4 space-y-4">
            {ticketTypes.map((tt) => {
              const soldOut = tt.remaining <= 0;
              const qty = quantities[tt.id] ?? 0;
              return (
                <div key={tt.id} className="rounded-lg border border-hairline p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-bone">{tt.name}</p>
                      {tt.description && <p className="mt-0.5 text-xs text-slate">{tt.description}</p>}
                      <p className="mt-1 text-xs text-slate">
                        {soldOut ? (
                          <span className="text-ember">Sold out</span>
                        ) : tt.remaining <= 10 ? (
                          <span className="text-gold">Only {tt.remaining} left</span>
                        ) : (
                          `${tt.remaining} available`
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-gold">{formatJod(tt.price)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={soldOut || qty <= 0}
                      onClick={() => setQty(tt.id, qty - 1, tt.remaining)}
                      className="h-8 w-8 rounded-full border border-hairline text-bone disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm text-bone">{qty}</span>
                    <button
                      type="button"
                      disabled={soldOut || qty >= tt.remaining}
                      onClick={() => setQty(tt.id, qty + 1, tt.remaining)}
                      className="h-8 w-8 rounded-full border border-hairline text-bone disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4">
            <span className="text-sm text-slate">Total</span>
            <span className="text-lg text-gold">{formatJod(total)}</span>
          </div>

          <button
            type="button"
            disabled={!lines.length}
            onClick={() => setStep("details")}
            className="mt-4 w-full rounded-full bg-gold py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-soft disabled:opacity-40"
          >
            Continue
          </button>

          {!isSignedInCustomer && profileLoaded && (
            <p className="mt-3 text-center text-xs text-slate">
              <Link href="/login" className="text-gold hover:underline">
                Log in
              </Link>{" "}
              to skip retyping your details next time.
            </p>
          )}
        </>
      )}

      {step === "details" && (
        <div className="mt-4 space-y-4">
          {isSignedInCustomer && !editingDetails ? (
            <div className="rounded-md border border-hairline bg-ink px-4 py-3">
              <p className="text-xs text-slate">Buying as</p>
              <p className="mt-1 text-sm text-bone">{fullName}</p>
              <p className="text-sm text-slate">{email}</p>
              <p className="text-sm text-slate">{phone}</p>
              <button
                type="button"
                onClick={() => setEditingDetails(true)}
                className="mt-2 text-xs text-gold hover:underline"
              >
                Not you? Edit details for this order
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate">Full Name (Three-Part Name)</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ضع اسمك الثلاثي باللغة الانجليزية هنا"
                  className="mt-1 w-full rounded-md border border-hairline bg-ink px-3 py-2 text-sm text-bone focus:border-gold"
                />
                <p className="mt-1 text-xs text-slate">
                  Please enter your full three-part name exactly as it should appear on your ticket.
                </p>
              </div>
              <div>
                <label className="text-xs text-slate">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-hairline bg-ink px-3 py-2 text-sm text-bone focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-slate">Phone number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="mt-1 w-full rounded-md border border-hairline bg-ink px-3 py-2 text-sm text-bone focus:border-gold"
                />
              </div>
            </>
          )}

          <div className="rounded-md border border-hairline bg-ink px-4 py-3 text-xs text-slate">
            <p className="text-bone">{eventName}</p>
            {lines.map((l) => {
              const tt = ticketTypes.find((t) => t.id === l.ticketTypeId)!;
              return (
                <p key={l.ticketTypeId}>
                  {l.quantity} × {tt.name} — {formatJod(Number(tt.price) * l.quantity)}
                </p>
              );
            })}
            <p className="mt-1 text-bone">Total: {formatJod(total)}</p>
          </div>

          {error && <p className="text-sm text-ember">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="flex-1 rounded-full border border-hairline py-3 text-sm text-bone"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex-1 rounded-full bg-gold py-3 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50"
            >
              {submitting ? "Creating order…" : "Reserve & pay via CliQ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
