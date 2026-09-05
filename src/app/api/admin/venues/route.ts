import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/apiUtils";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const venues = await query(`SELECT id, name, city FROM venues ORDER BY name`);
    return NextResponse.json({ venues });
  } catch (err) {
    return handleApiError(err);
  }
}
