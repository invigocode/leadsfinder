import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { PlacesError, searchPlaces } from "@/lib/places";
import { demoPlaces } from "@/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const blocked = guard(req, "search", 30);
  if (blocked) return blocked;

  let body: { query?: unknown; location?: unknown; max?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim().slice(0, 80) : "";
  const location = typeof body.location === "string" ? body.location.trim().slice(0, 80) : "";
  const max = Math.min(60, Math.max(1, Number(body.max) || 20));
  if (!query || !location) {
    return NextResponse.json({ error: "Enter what you're looking for and where." }, { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ leads: demoPlaces(query, location, max), demo: true });

  try {
    const leads = await searchPlaces(query, location, max, key);
    return NextResponse.json({ leads, demo: false });
  } catch (e) {
    const msg = e instanceof PlacesError ? e.message : "Couldn't reach Google Maps. Try again.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
