import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { enrichWebsite } from "@/lib/enrich";
import { demoEnrich } from "@/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const blocked = guard(req, "enrich", 600);
  if (blocked) return blocked;

  let body: { id?: unknown; website?: unknown; demo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const website = typeof body.website === "string" ? body.website.trim() : "";
  const id = typeof body.id === "string" ? body.id : website;
  try {
    new URL(website);
  } catch {
    return NextResponse.json({ error: "Invalid website." }, { status: 400 });
  }

  if (body.demo === true) return NextResponse.json(demoEnrich(id, website));
  return NextResponse.json(await enrichWebsite(website));
}
