"use client";
import { useState } from "react";
import { useSession } from "@/lib/useSession";
import { InlineLoginForm } from "@/components/InlineLoginForm";

interface CheckInResponse {
  result:
    | { outcome: "INVALID"; reason: string }
    | { outcome: "VALID_CHECKED_IN"; ticket: Record<string, unknown> }
    | { outcome: "ALREADY_USED"; ticket: Record<string, unknown>; firstCheckIn: Record<string, unknown> | null };
}

export default function StaffScanPage() {
  const session = useSession();
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState<CheckInResponse["result"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session === undefined) {
    return <div className="px-8 py-24 text-center text-slate">Loading…</div>;
  }
  if (session === null || (session.role !== "STAFF" && session.role !== "ADMIN")) {
    return (
      <InlineLoginForm
        title="Door staff log in"
        description="Log in with your staff username (email) and password to start scanning tickets."
        requiredRoles={["STAFF", "ADMIN"]}
      />
    );
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Could not verify ticket.");
      return;
    }
    setResult(data.result);
    setIdentifier("");
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-14 sm:px-8">
      <h1 className="font-display text-3xl text-bone">Door check-in</h1>
      <p className="mt-2 text-sm text-slate">
        Scan a QR code with a handheld scanner (it types + Enter), or type a ticket number manually.
      </p>

      <form onSubmit={handleCheckIn} className="mt-6 flex gap-2">
        <input
          autoFocus
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Scan QR or enter TKT-000001"
          className="flex-1 rounded-full border border-hairline bg-ink-card px-4 py-3 text-sm text-bone focus:border-gold"
        />
        <button
          disabled={loading}
          className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50"
        >
          Check in
        </button>
      </form>

      {error && (
        <div className="mt-8 rounded-lg border border-ember/50 bg-ember/10 p-6 text-center">
          <p className="font-display text-xl text-ember">INVALID</p>
          <p className="mt-2 text-sm text-bone">{error}</p>
        </div>
      )}

      {result?.outcome === "VALID_CHECKED_IN" && (
        <div className="mt-8 rounded-lg border border-emerald/50 bg-emerald/10 p-6 text-center">
          <p className="font-display text-2xl text-emerald">VALID — CHECKED IN</p>
          <dl className="mt-4 space-y-1 text-sm text-bone">
            <p>{String(result.ticket.ticket_number)}</p>
            <p>{String(result.ticket.customer_name)}</p>
            <p>{String(result.ticket.event_name)} · {String(result.ticket.ticket_type_name)}</p>
          </dl>
        </div>
      )}

      {result?.outcome === "ALREADY_USED" && (
        <div className="mt-8 rounded-lg border border-ember/50 bg-ember/10 p-6 text-center">
          <p className="font-display text-2xl text-ember">ALREADY USED</p>
          <dl className="mt-4 space-y-1 text-sm text-bone">
            <p>{String(result.ticket.ticket_number)}</p>
            <p>{String(result.ticket.customer_name)}</p>
            {result.firstCheckIn && (
              <p className="text-slate">
                First checked in {new Date(String(result.firstCheckIn.created_at)).toLocaleString()} by{" "}
                {String(result.firstCheckIn.staff_name ?? "staff")}
              </p>
            )}
          </dl>
        </div>
      )}

      {result?.outcome === "INVALID" && (
        <div className="mt-8 rounded-lg border border-ember/50 bg-ember/10 p-6 text-center">
          <p className="font-display text-xl text-ember">INVALID TICKET</p>
          <p className="mt-2 text-sm text-bone">{result.reason}</p>
        </div>
      )}
    </div>
  );
}
