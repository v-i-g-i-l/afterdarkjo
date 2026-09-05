import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { handleApiError } from "@/lib/apiUtils";

export async function GET() {
  try {
    const categories = await query(
      `SELECT id, name, slug FROM categories ORDER BY name ASC`
    );
    return NextResponse.json({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}
