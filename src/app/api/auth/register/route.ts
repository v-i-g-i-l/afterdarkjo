import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/apiUtils";
import { assertThreePartName, OrderError } from "@/lib/services/orders";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6, "Please enter a valid phone number."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();

    // The account's full name is reused everywhere a ticket needs a name
    // (checkout auto-fill, ticket PDFs), so it must satisfy the same
    // three-part-name rule enforced at checkout.
    let fullName: string;
    try {
      fullName = assertThreePartName(body.fullName);
    } catch (err) {
      if (err instanceof OrderError) {
        return jsonError(400, "INVALID_NAME", err.message);
      }
      throw err;
    }

    const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);
    if (existing) {
      return jsonError(409, "EMAIL_TAKEN", "An account with this email already exists.");
    }

    const passwordHash = await hashPassword(body.password);
    const user = await queryOne<{
      id: string;
      email: string;
      full_name: string;
      role: "ADMIN" | "STAFF" | "CUSTOMER";
    }>(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1,$2,$3,$4,'CUSTOMER')
       RETURNING id, email, full_name, role`,
      [email, passwordHash, fullName, body.phone.trim()]
    );
    if (!user) throw new Error("Failed to create user");

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.");
    }
    return handleApiError(err);
  }
}
