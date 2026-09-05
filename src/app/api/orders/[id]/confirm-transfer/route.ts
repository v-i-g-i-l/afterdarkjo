import { NextResponse } from "next/server";
import { submitTransferConfirmation } from "@/lib/services/orders";
import { handleApiError } from "@/lib/apiUtils";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await submitTransferConfirmation(id);
    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
