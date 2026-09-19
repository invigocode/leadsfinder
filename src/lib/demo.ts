import type { EnrichResult, PlaceLead } from "./types";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

const PREFIX = ["Bright", "Northside", "Oakwood", "Harbour", "Summit", "Cedar", "Riverside", "Prime", "Willow", "Crown", "Elm", "Stonebridge", "Alder", "Lakeshore", "Fenwick", "Meadow"];
const SUFFIX = ["& Co", "Studio", "Partners", "Group", "Centre", "House", "Works", "Collective", "Specialists", "Services"];
const STREETS = ["High Street", "Market Place", "Station Road", "Church Lane", "Mill Road", "King Street", "Park Avenue", "Bridge Street"];

/** Sample data so the app is fully usable before a Google API key is connected. */
export function demoPlaces(query: string, location: string, max: number): PlaceLead[] {
  const r = rng(hash(`${query}|${location}`));
  const kind = query.trim() || "business";
  const cap = kind.charAt(0).toUpperCase() + kind.slice(1);
  const n = Math.min(max, 40);
  const seen = new Set<string>();
  const out: PlaceLead[] = [];
  while (out.length < n) {
    const name = `${PREFIX[Math.floor(r() * PREFIX.length)]} ${cap} ${SUFFIX[Math.floor(r() * SUFFIX.length)]}`;
    if (seen.has(name)) continue;
    seen.add(name);
    const hasSite = r() > 0.25;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const reviewCount = r() > 0.1 ? Math.floor(r() ** 2 * 260) : 0;
    out.push({
      id: `demo-${hash(name + location)}`,
      name,
      address: `${Math.floor(r() * 180) + 1} ${STREETS[Math.floor(r() * STREETS.length)]}, ${location}`,
      category: cap,
      phone: r() > 0.12 ? `0${Math.floor(1000 + r() * 8999)} ${Math.floor(100000 + r() * 899999)}` : undefined,
      website: hasSite ? `https://www.${slug}.example` : undefined,
      mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(name + " " + location)}`,
      rating: reviewCount ? Math.round((3 + r() * 2) * 10) / 10 : undefined,
      reviewCount,
    });
  }
  return out;
}

export function demoEnrich(id: string, website: string): EnrichResult {
  const r = rng(hash(id));
  const host = new URL(website).hostname.replace(/^www\./, "");
  const dead = r() < 0.08;
  return {
    emails: !dead && r() > 0.4 ? [`${r() > 0.5 ? "info" : "hello"}@${host}`] : [],
    audit: {
      reachable: !dead,
      https: r() > 0.2,
      mobileReady: r() > 0.35,
      lastYear: r() > 0.4 ? new Date().getFullYear() - Math.floor(r() * 7) : undefined,
      builder: r() > 0.7 ? ["Wix", "Weebly", "GoDaddy", "Squarespace"][Math.floor(r() * 4)] : undefined,
      hasContactForm: r() > 0.5,
      socials: ["facebook", "instagram", "linkedin"].filter(() => r() > 0.5),
    },
  };
}
