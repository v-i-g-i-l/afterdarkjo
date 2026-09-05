import { NextResponse } from "next/server";
import { getTicketPublicStatus } from "@/lib/services/checkin";
import { handleApiError, jsonError } from "@/lib/apiUtils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ticket = await getTicketPublicStatus(token);
    if (!ticket) return jsonError(404, "NOT_FOUND", "No ticket matches this code.");
    return NextResponse.json({ ticket });
  } catch (err) {
    return handleApiError(err);
  }
}
