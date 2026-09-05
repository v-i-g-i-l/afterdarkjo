"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfileSettingsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/account/profile")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error?.message ?? "Please log in to view your profile.");
          return;
        }
        setFullName(d.profile.full_name ?? "");
        setEmail(d.profile.email ?? "");
        setPhone(d.profile.phone ?? "");
      })
      .finally(() => setLoaded(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    const res = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Could not save your details.");
      return;
    }
    setMessage("Saved. Future orders will use these details automatically.");
  }

  if (!loaded) {
    return <div className="mx-auto max-w-md px-5 py-24 text-center text-slate">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14 sm:px-8">
      <div className="flex items-center gap-6 border-b border-hairline pb-4 text-sm">
        <Link href="/account/tickets" className="text-slate hover:text-gold">
          My Tickets
        </Link>
        <Link href="/account/orders" className="text-slate hover:text-gold">
          My Orders
        </Link>
        <span className="text-bone">Profile Settings</span>
      </div>

      {error ? (
        <p className="mt-8 text-sm text-slate">
          {error} <Link href="/login" className="text-gold hover:underline">Log in</Link>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs text-slate">Full name (as it should appear on your tickets)</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone focus:border-gold"
            />
            <p className="mt-1 text-xs text-slate">Must be your full three-part name.</p>
          </div>
          <div>
            <label className="text-xs text-slate">Email</label>
            <input
              value={email}
              disabled
              className="mt-1 w-full rounded-md border border-hairline bg-ink-raised px-3 py-2 text-sm text-slate"
            />
            <p className="mt-1 text-xs text-slate">Email can&apos;t be changed here — contact support if needed.</p>
          </div>
          <div>
            <label className="text-xs text-slate">Phone</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone focus:border-gold"
            />
          </div>
          {message && <p className="text-sm text-emerald">{message}</p>}
          {error && <p className="text-sm text-ember">{error}</p>}
          <button
            disabled={saving}
            className="w-full rounded-full bg-gold py-3 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}
