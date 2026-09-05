import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { handleApiError } from "@/lib/apiUtils";

export async function GET() {
  try {
    const settings = await queryOne(
      `SELECT business_name, cliq_alias, payment_instructions, support_phone, support_email, reservation_minutes
       FROM site_settings WHERE id = 1`
    );
    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}
