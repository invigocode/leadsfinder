import type { PlaceLead } from "./types";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.primaryTypeDisplayName",
  "nextPageToken",
].join(",");

interface ApiPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryTypeDisplayName?: { text?: string };
}

export class PlacesError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

/** Google Places API (New) - Text Search. Returns up to `max` (<=60) open businesses. */
export async function searchPlaces(query: string, location: string, max: number, apiKey: string): Promise<PlaceLead[]> {
  const out: PlaceLead[] = [];
  let pageToken: string | undefined;
  const pages = Math.ceil(Math.min(max, 60) / 20);

  for (let i = 0; i < pages; i++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey, "x-goog-fieldmask": FIELD_MASK },
      body: JSON.stringify({ textQuery: `${query} in ${location}`, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message ?? `Google Places returned ${res.status}`;
      throw new PlacesError(msg, res.status === 403 || res.status === 400 ? 502 : 502);
    }
    const data = (await res.json()) as { places?: ApiPlace[]; nextPageToken?: string };
    for (const p of data.places ?? []) {
      if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
      out.push({
        id: p.id,
        name: p.displayName?.text ?? "Unnamed business",
        address: p.formattedAddress ?? "",
        category: p.primaryTypeDisplayName?.text,
        phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber,
        website: p.websiteUri,
        mapsUrl: p.googleMapsUri,
        rating: p.rating,
        reviewCount: p.userRatingCount ?? 0,
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return out.slice(0, max);
}
