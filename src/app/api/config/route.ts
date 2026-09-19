import { NextResponse } from "next/server";
import { needsAccessCode } from "@/lib/guard";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    needsCode: needsAccessCode(),
    demo: !process.env.GOOGLE_PLACES_API_KEY,
  });
}
