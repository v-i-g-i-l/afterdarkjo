import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, handleApiError, jsonError } from "@/lib/apiUtils";
import { verifyAndCheckIn } from "@/lib/services/checkin";

const schema = z.object({
  identifier: z.string().min(3), // qr_token OR ticket_number
  location: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireRole("ADMIN", "STAFF");
    const body = schema.parse(await req.json());

    // Accept a full verification URL (https://domain/ticket/verify/<token>) too.
    let identifier = body.identifier.trim();
    const urlMatch = identifier.match(/\/ticket\/verify\/([a-f0-9]+)/i);
    if (urlMatch) identifier = urlMatch[1];

    const result = await verifyAndCheckIn(identifier, session.userId, body.location);
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", "Please provide a ticket code.");
    }
    return handleApiError(err);
  }
}
