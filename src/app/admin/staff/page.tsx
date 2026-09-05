"use client";
import { useEffect, useState } from "react";

interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export default function AdminStaffPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "STAFF" as "ADMIN" | "STAFF" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/admin/staff").then((r) => r.json()).then((d) => setUsers(d.users ?? []));
  }
  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Could not create account.");
      return;
    }
    setForm({ fullName: "", email: "", password: "", role: "STAFF" });
    load();
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl text-bone">Staff &amp; admin accounts</h1>

      <div className="mt-8 space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-lg border border-hairline bg-ink-card p-3">
            <div>
              <p className="text-sm text-bone">{u.full_name}</p>
              <p className="text-xs text-slate">{u.email}</p>
            </div>
            <span className="rounded-full bg-hairline px-3 py-1 text-xs text-slate">{u.role}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-lg border border-dashed border-hairline p-5">
        <p className="text-sm text-bone">Add account</p>
        <input
          required
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="w-full rounded-md border border-hairline bg-ink px-3 py-2 text-sm text-bone"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-md border border-hairline bg-ink px-3 py-2 text-sm text-bone"
        />
        <input
          required
          type="password"
          minLength={8}
          placeholder="Temporary password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-md border border-hairline bg-ink px-3 py-2 text-sm text-bone"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "STAFF" })}
          className="w-full rounded-md border border-hairline bg-ink px-3 py-2 text-sm text-bone"
        >
          <option value="STAFF">Staff (scanning only)</option>
          <option value="ADMIN">Admin (full access)</option>
        </select>
        {error && <p className="text-sm text-ember">{error}</p>}
        <button
          disabled={saving}
          className="w-full rounded-full bg-gold py-2.5 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
