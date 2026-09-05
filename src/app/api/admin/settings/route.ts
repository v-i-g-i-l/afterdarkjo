import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleApiError, jsonError } from "@/lib/apiUtils";
import { query, queryOne } from "@/lib/db";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const settings = await queryOne(`SELECT * FROM site_settings WHERE id = 1`);
    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  businessName: z.string().min(1),
  cliqAlias: z.string().min(1),
  paymentInstructions: z.string().min(1),
  supportPhone: z.string().min(1),
  supportEmail: z.string().email(),
  reservationMinutes: z.number().int().min(5).max(120),
});

export async function PUT(req: Request) {
  try {
    await requireRole("ADMIN");
    const body = schema.parse(await req.json());
    await query(
      `UPDATE site_settings SET
        business_name = $1, cliq_alias = $2, payment_instructions = $3,
        support_phone = $4, support_email = $5, reservation_minutes = $6, updated_at = now()
       WHERE id = 1`,
      [
        body.businessName,
        body.cliqAlias,
        body.paymentInstructions,
        body.supportPhone,
        body.supportEmail,
        body.reservationMinutes,
      ]
    );
    const settings = await queryOne(`SELECT * FROM site_settings WHERE id = 1`);
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.");
    }
    return handleApiError(err);
  }
}
