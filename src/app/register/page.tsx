"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error?.message ?? "Registration failed.");
      return;
    }
    router.push("/account/tickets");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5 py-14">
      <h1 className="font-display text-3xl text-bone">Create your account</h1>
      <p className="mt-2 text-sm text-slate">Save your orders and access your tickets anytime.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs text-slate">Full name (as it should appear on your tickets)</label>
          <input
            required
            placeholder="ضع اسمك الثلاثي هنا "
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone focus:border-gold"
          />
          <p className="mt-1 text-xs text-slate">
            Please enter your full three-part name — you won&apos;t need to retype it at checkout again.
          </p>
        </div>
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
          <label className="text-xs text-slate">Phone</label>
          <input
            required
            placeholder="07XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline bg-ink-card px-3 py-2 text-sm text-bone focus:border-gold"
          />
        </div>
        <div>
          <label className="text-xs text-slate">Password</label>
          <input
            type="password"
            required
            minLength={8}
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
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate">
        Already have an account?{" "}
        <Link href="/login" className="text-gold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
