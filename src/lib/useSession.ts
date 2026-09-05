"use client";
import { useEffect, useState } from "react";

export interface ClientSession {
  userId: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  fullName: string;
}

export function useSession() {
  const [session, setSession] = useState<ClientSession | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setSession(d.user ?? null);
      })
      .catch(() => mounted && setSession(null));
    return () => {
      mounted = false;
    };
  }, []);

  return session; // undefined = loading, null = logged out
}
