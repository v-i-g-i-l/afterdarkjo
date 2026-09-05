import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleApiError, jsonError } from "@/lib/apiUtils";
import { query, queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const users = await query(
      `SELECT id, email, full_name, role, is_active, created_at FROM users
       WHERE role IN ('ADMIN', 'STAFF') ORDER BY created_at DESC`
    );
    return NextResponse.json({ users });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "STAFF"]),
});

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN");
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing) return jsonError(409, "EMAIL_TAKEN", "An account with this email already exists.");

    const passwordHash = await hashPassword(body.password);
    const user = await queryOne(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1,$2,$3,$4) RETURNING id, email, full_name, role, created_at`,
      [email, passwordHash, body.fullName, body.role]
    );
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.");
    }
    return handleApiError(err);
  }
}
