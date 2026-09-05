import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/apiUtils";
import { listPendingPayments } from "@/lib/services/payments";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const payments = await listPendingPayments();
    return NextResponse.json({ payments });
  } catch (err) {
    return handleApiError(err);
  }
}
