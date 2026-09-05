import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { handleApiError } from "@/lib/apiUtils";

export async function GET() {
  try {
    const venues = await query(
      `SELECT DISTINCT city FROM venues ORDER BY city ASC`
    );
    return NextResponse.json({ cities: venues.map((v) => (v as { city: string }).city) });
  } catch (err) {
    return handleApiError(err);
  }
}
