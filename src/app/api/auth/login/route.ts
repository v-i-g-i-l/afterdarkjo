import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/apiUtils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();

    const user = await queryOne<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: "ADMIN" | "STAFF" | "CUSTOMER";
      is_active: boolean;
    }>(`SELECT * FROM users WHERE email = $1`, [email]);

    if (!user || !user.is_active) {
      return jsonError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
    }
    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) {
      return jsonError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
    }

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
      return jsonError(400, "VALIDATION_ERROR", "Please enter a valid email and password.");
    }
    return handleApiError(err);
  }
}
