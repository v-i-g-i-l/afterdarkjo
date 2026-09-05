import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleApiError, jsonError } from "@/lib/apiUtils";
import { queryOne } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireRole("CUSTOMER", "ADMIN", "STAFF");
    const user = await queryOne<{ full_name: string; email: string; phone: string | null }>(
      `SELECT full_name, email, phone FROM users WHERE id = $1`,
      [session.userId]
    );
    if (!user) return jsonError(404, "NOT_FOUND", "Account not found.");
    return NextResponse.json({ profile: user });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(6),
});

export async function PUT(req: Request) {
  try {
    const session = await requireRole("CUSTOMER", "ADMIN", "STAFF");
    const body = schema.parse(await req.json());
    const user = await queryOne<{ full_name: string; email: string; phone: string | null }>(
      `UPDATE users SET full_name = $1, phone = $2, updated_at = now() WHERE id = $3
       RETURNING full_name, email, phone`,
      [body.fullName.trim(), body.phone.trim(), session.userId]
    );
    return NextResponse.json({ profile: user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.");
    }
    return handleApiError(err);
  }
}
