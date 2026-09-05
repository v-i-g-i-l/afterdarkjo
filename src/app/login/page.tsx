"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
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
      setError(data.error?.message ?? "Login failed.");
      return;
    }
    const role = data.user.role;
    router.push(role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff/scan" : "/account/tickets");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5 py-14">
      <h1 className="font-display text-3xl text-bone">Welcome back</h1>
      <p className="mt-2 text-sm text-slate">Log in to view your tickets and orders.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs text-slate">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          disabled={loading}
          className="w-full rounded-full bg-gold py-3 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate">
        No account?{" "}
        <Link href="/register" className="text-gold hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
