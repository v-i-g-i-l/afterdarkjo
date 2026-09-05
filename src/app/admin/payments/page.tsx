"use client";
import { useEffect, useState } from "react";
import { formatJod } from "@/lib/format";

interface PendingPayment {
  order_id: string;
  order_number: string;
  customer_full_name: string;
  email: string;
  phone: string;
  total_amount: string;
  currency: string;
  created_at: string;
  event_name: string;
  payment_id: string;
  submitted_at: string;
  method: string;
  line_items: { ticketType: string; quantity: number }[];
}

const REJECTION_REASONS = [
  { value: "PAYMENT_NOT_RECEIVED", label: "Payment not received" },
  { value: "INCORRECT_AMOUNT", label: "Incorrect amount" },
  { value: "INCORRECT_RECIPIENT", label: "Incorrect recipient" },
  { value: "REFERENCE_MISMATCH", label: "Payment reference mismatch" },
  { value: "DUPLICATE_PAYMENT", label: "Duplicate payment" },
  { value: "OTHER", label: "Other" },
];

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PendingPayment[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("PAYMENT_NOT_RECEIVED");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/payments/pending");
    const data = await res.json();
    setPayments(data.payments ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(orderId: string) {
    setBusyId(orderId);
    setMessage(null);
    const res = await fetch(`/api/admin/payments/${orderId}/approve`, { method: "POST" });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error?.message ?? "Approval failed.");
      return;
    }
    setMessage(
      data.alreadyProcessed
        ? "Already approved previously — no duplicate tickets were created."
        : `Approved. ${data.tickets.length} ticket(s) generated.`
    );
    load();
  }

  async function reject(orderId: string) {
    setBusyId(orderId);
    setMessage(null);
    const res = await fetch(`/api/admin/payments/${orderId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, note }),
    });
    const data = await res.json();
    setBusyId(null);
    setRejectingId(null);
    setNote("");
    if (!res.ok) {
      setMessage(data.error?.message ?? "Rejection failed.");
      return;
    }
    setMessage("Payment rejected. Customer notified.");
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-bone">Payment Verification</h1>
      <p className="mt-2 text-sm text-slate">
        Check the business CliQ account for each transfer before approving. Approval is atomic and
        idempotent — clicking twice will never issue duplicate tickets.
      </p>

      {message && (
        <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-gold">
          {message}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {payments?.length === 0 && (
          <p className="text-sm text-slate">No payments awaiting verification.</p>
        )}
        {payments?.map((p) => (
          <div key={p.order_id} className="rounded-lg border border-hairline bg-ink-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-bone">{p.order_number} · {p.event_name}</p>
                <p className="mt-1 text-sm text-slate">{p.customer_full_name}</p>
                <p className="text-xs text-slate">{p.email} · {p.phone}</p>
                <p className="mt-2 text-xs text-slate">
                  {p.line_items?.map((l) => `${l.quantity} × ${l.ticketType}`).join(", ")}
                </p>
                <p className="mt-1 text-xs text-slate">
                  Submitted {new Date(p.submitted_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl text-gold">{formatJod(p.total_amount)}</p>
                <p className="text-xs text-slate">via {p.method}</p>
              </div>
            </div>

            {rejectingId === p.order_id ? (
              <div className="mt-4 space-y-3 border-t border-hairline pt-4">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-md border border-hairline bg-ink px-3 py-2 text-sm text-bone"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note"
                  className="w-full rounded-md border border-hairline bg-ink px-3 py-2 text-sm text-bone"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setRejectingId(null)}
                    className="flex-1 rounded-full border border-hairline py-2 text-sm text-bone"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={busyId === p.order_id}
                    onClick={() => reject(p.order_id)}
                    className="flex-1 rounded-full bg-ember py-2 text-sm text-bone hover:bg-ember/80"
                  >
                    Confirm rejection
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-3 border-t border-hairline pt-4">
                <button
                  disabled={busyId === p.order_id}
                  onClick={() => approve(p.order_id)}
                  className="flex-1 rounded-full bg-emerald py-2 text-sm text-ink hover:bg-emerald/80 disabled:opacity-50"
                >
                  {busyId === p.order_id ? "Approving…" : "Approve Payment"}
                </button>
                <button
                  disabled={busyId === p.order_id}
                  onClick={() => setRejectingId(p.order_id)}
                  className="flex-1 rounded-full border border-ember py-2 text-sm text-ember hover:bg-ember/10"
                >
                  Reject Payment
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
