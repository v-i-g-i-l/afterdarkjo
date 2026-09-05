"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function InlineLoginForm({
  title,
  description,
  requiredRoles,
}: {
  title: string;
  description: string;
  requiredRoles?: string[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Log in failed.");
      return;
    }
    if (requiredRoles && !requiredRoles.includes(data.user.role)) {
      setError("This account doesn't have access to this area.");
      await fetch("/api/auth/logout", { method: "POST" });
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-5 py-24">
      <p className="font-display text-2xl text-bone">{title}</p>
      <p className="mt-2 text-sm text-slate">{description}</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs text-slate">Username (email)</label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs text-slate">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone focus:border-gold"
          />
        </div>
        {error && <p className="text-sm text-ember">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gold py-3 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
