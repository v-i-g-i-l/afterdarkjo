import { NextResponse } from "next/server";
import { getSession, type SessionPayload, type UserRole } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Requires a logged-in session with one of `roles`. Throws ApiError(401/403) otherwise. */
export async function requireRole(...roles: UserRole[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, "UNAUTHENTICATED", "Please log in to continue.");
  }
  if (roles.length && !roles.includes(session.role)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this resource.");
  }
  return session;
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return jsonError(err.status, err.code, err.message);
  }
  // Domain errors thrown by service layer (OrderError) surface as 400s.
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    "message" in err
  ) {
    const anyErr = err as { code: string; message: string };
    return jsonError(400, anyErr.code || "BAD_REQUEST", anyErr.message);
  }
  console.error("Unhandled API error:", err);
  return jsonError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}
