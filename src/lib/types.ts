/** Data returned by Google Places (or demo generator). */
export interface PlaceLead {
  id: string;
  name: string;
  address: string;
  category?: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  rating?: number;
  reviewCount: number;
}

/** Findings from looking at a business's own website. */
export interface SiteAudit {
  reachable: boolean;
  https: boolean;
  mobileReady: boolean;
  lastYear?: number;
  builder?: string;
  hasContactForm: boolean;
  socials: string[];
}

export interface EnrichResult {
  emails: string[];
  audit: SiteAudit;
}

export type EnrichStatus = "idle" | "pending" | "done" | "failed";

export interface ScorePart {
  key: "reach" | "reviews" | "website" | "established";
  label: string;
  points: number;
  max: number;
  note: string;
}

export type Tier = "hot" | "warm" | "cold";

export interface ScoreResult {
  total: number;
  tier: Tier;
  parts: ScorePart[];
  angles: string[];
}

export interface Lead extends PlaceLead {
  emails: string[];
  audit?: SiteAudit;
  enrich: EnrichStatus;
  score: ScoreResult;
}

export interface SavedSearch {
  id: string;
  query: string;
  location: string;
  savedAt: string;
  leads: Lead[];
}
