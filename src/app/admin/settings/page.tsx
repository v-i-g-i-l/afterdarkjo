"use client";
import { useEffect, useState } from "react";

interface Settings {
  business_name: string;
  cliq_alias: string;
  payment_instructions: string;
  support_phone: string;
  support_email: string;
  reservation_minutes: number;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: settings.business_name,
        cliqAlias: settings.cliq_alias,
        paymentInstructions: settings.payment_instructions,
        supportPhone: settings.support_phone,
        supportEmail: settings.support_email,
        reservationMinutes: Number(settings.reservation_minutes),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error?.message ?? "Could not save settings.");
      return;
    }
    setSettings(data.settings);
    setMessage("Settings saved.");
  }

  if (!settings) return <p className="text-slate">Loading…</p>;

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl text-bone">Payment settings</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs text-slate">Business name</label>
          <input
            value={settings.business_name}
            onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
          />
        </div>
        <div>
          <label className="text-xs text-slate">CliQ alias</label>
          <input
            value={settings.cliq_alias}
            onChange={(e) => setSettings({ ...settings, cliq_alias: e.target.value })}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-slate">Payment instructions</label>
          <textarea
            value={settings.payment_instructions}
            onChange={(e) => setSettings({ ...settings, payment_instructions: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate">Support phone</label>
            <input
              value={settings.support_phone}
              onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
            />
          </div>
          <div>
            <label className="text-xs text-slate">Support email</label>
            <input
              value={settings.support_email}
              onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
              className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate">Reservation duration (minutes)</label>
          <input
            type="number"
            value={settings.reservation_minutes}
            onChange={(e) => setSettings({ ...settings, reservation_minutes: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone"
          />
        </div>
        {message && <p className="text-sm text-gold">{message}</p>}
        <button
          disabled={saving}
          className="w-full rounded-full bg-gold py-3 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
