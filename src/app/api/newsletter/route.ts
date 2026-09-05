import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = form?.get("email");
  console.log(`[newsletter] signup: ${email}`);
  return NextResponse.redirect(new URL("/?subscribed=1", req.url), 303);
}
