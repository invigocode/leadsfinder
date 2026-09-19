import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const hits = new Map<string, number[]>();

/** Best-effort in-memory limiter (per serverless instance). Swap for Upstash/Redis when you add real accounts. */
function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

function digest(s: string) {
  return createHash("sha256").update(s).digest();
}

export function needsAccessCode(): boolean {
  return Boolean(process.env.ACCESS_CODE);
}

export function accessCodeValid(code: string | null): boolean {
  const expected = process.env.ACCESS_CODE;
  if (!expected) return true;
  return timingSafeEqual(digest(code ?? ""), digest(expected));
}

/** Returns an error response if the request should be rejected, otherwise null. */
export function guard(req: Request, bucket: string, limit: number, windowMs = 10 * 60_000): NextResponse | null {
  if (!accessCodeValid(req.headers.get("x-access-code"))) {
    return NextResponse.json({ error: "Enter a valid access code to continue.", code: "access" }, { status: 401 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`${bucket}:${ip}`, limit, windowMs)) {
    return NextResponse.json({ error: "Too many requests. Wait a few minutes and try again." }, { status: 429 });
  }
  return null;
}
