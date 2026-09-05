import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createOrder } from "@/lib/services/orders";
import { handleApiError, jsonError } from "@/lib/apiUtils";

const schema = z.object({
  eventId: z.string().min(1),
  customerFullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  lines: z
    .array(
      z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const session = await getSession();

    const order = await createOrder({
      eventId: body.eventId,
      customerId: session?.userId ?? null,
      customerFullName: body.customerFullName,
      email: body.email,
      phone: body.phone,
      lines: body.lines,
    });

    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(400, "VALIDATION_ERROR", err.issues[0]?.message ?? "Invalid input.");
    }
    return handleApiError(err);
  }
}
