import type { Lead, PlaceLead, ScorePart, ScoreResult, SiteAudit, Tier } from "./types";

/**
 * Lead score (0-100) = how good a prospect this business is for someone selling
 * reviews / website / online-presence services.
 *
 *   Reachability  30  can you actually contact them?
 *   Reviews       30  is there a reviews problem to fix?
 *   Website       30  is there a website problem to fix (or no website at all)?
 *   Established   10  is it a real, trading business with customers?
 */
export const WEIGHTS = { reach: 30, reviews: 30, website: 30, established: 10 } as const;

export function tierFor(total: number): Tier {
  if (total >= 70) return "hot";
  if (total >= 45) return "warm";
  return "cold";
}

interface Input extends PlaceLead {
  emails: string[];
  audit?: SiteAudit;
  /** true once the website lookup has finished (successfully or not) */
  enriched: boolean;
}

export function scoreLead(l: Input): ScoreResult {
  const angles: string[] = [];
  const year = new Date().getFullYear();

  // ---- Reachability (30)
  let reach = 0;
  const reachNotes: string[] = [];
  if (l.emails.length) { reach += 15; reachNotes.push("email found"); }
  else if (l.website && !l.enriched) reachNotes.push("email not looked up yet");
  else reachNotes.push("no email found");
  if (l.phone) { reach += 10; reachNotes.push("phone listed"); } else reachNotes.push("no phone");
  if (l.website) { reach += 5; reachNotes.push("website listed"); }

  // ---- Reviews (30)
  let rating = 0;
  let count = 0;
  if (l.rating == null || l.reviewCount === 0) rating = 10;
  else if (l.rating < 3.5) rating = 15;
  else if (l.rating < 4.0) rating = 12;
  else if (l.rating < 4.4) rating = 8;
  else if (l.rating < 4.7) rating = 4;

  if (l.reviewCount < 10) count = 15;
  else if (l.reviewCount < 30) count = 12;
  else if (l.reviewCount < 75) count = 8;
  else if (l.reviewCount < 150) count = 4;

  const reviews = rating + count;
  const reviewNote =
    l.reviewCount === 0
      ? "no reviews yet"
      : `${l.rating?.toFixed(1) ?? "?"} stars from ${l.reviewCount} review${l.reviewCount === 1 ? "" : "s"}`;
  if (l.rating != null && l.rating < 4.2 && l.reviewCount >= 5) angles.push("Review recovery");
  if (l.reviewCount < 30) angles.push("Review growth");

  // ---- Website (30)
  let website = 0;
  let websiteNote = "";
  if (!l.website) {
    website = 30;
    websiteNote = "no website listed";
    angles.unshift("Website creation");
  } else if (!l.enriched || !l.audit) {
    website = 10;
    websiteNote = l.enriched ? "couldn't check the site" : "site not checked yet";
  } else if (!l.audit.reachable) {
    website = 26;
    websiteNote = "listed site didn't load";
    angles.unshift("Website rebuild");
  } else {
    const issues: string[] = [];
    if (!l.audit.https) { website += 6; issues.push("no HTTPS"); }
    if (!l.audit.mobileReady) { website += 9; issues.push("not mobile-friendly"); angles.push("Mobile fix"); }
    if (l.audit.lastYear && l.audit.lastYear <= year - 2) { website += 6; issues.push(`footer says ${l.audit.lastYear}`); }
    if (l.audit.builder) { website += 3; issues.push(`${l.audit.builder} template`); }
    if (!l.audit.hasContactForm) { website += 3; issues.push("no contact form"); }
    if (l.audit.socials.length === 0) { website += 3; issues.push("no social links"); angles.push("Social presence"); }
    website = Math.min(30, website);
    websiteNote = issues.length ? issues.join(", ") : "site looks in good shape";
    if (website >= 12) angles.unshift("Website refresh");
  }

  // ---- Established (10)
  const established = l.reviewCount >= 20 ? 10 : l.reviewCount >= 5 ? 5 : 0;
  const establishedNote =
    established === 10 ? "steady customer base" : established === 5 ? "some customer activity" : "very little activity";

  const parts: ScorePart[] = [
    { key: "reach", label: "Reachability", points: reach, max: WEIGHTS.reach, note: reachNotes.join(", ") },
    { key: "reviews", label: "Review opportunity", points: reviews, max: WEIGHTS.reviews, note: reviewNote },
    { key: "website", label: "Website opportunity", points: website, max: WEIGHTS.website, note: websiteNote },
    { key: "established", label: "Established business", points: established, max: WEIGHTS.established, note: establishedNote },
  ];

  const total = Math.max(0, Math.min(100, reach + reviews + website + established));
  return { total, tier: tierFor(total), parts, angles: Array.from(new Set(angles)).slice(0, 4) };
}

export function buildLead(p: PlaceLead, extra?: Partial<Pick<Lead, "emails" | "audit" | "enrich">>): Lead {
  const emails = extra?.emails ?? [];
  const enrich = extra?.enrich ?? "idle";
  const audit = extra?.audit;
  const score = scoreLead({ ...p, emails, audit, enriched: enrich === "done" || enrich === "failed" });
  return { ...p, emails, audit, enrich, score };
}

/** A lead worth contacting: a decent score AND a way to reach them. */
export const QUALIFY_MIN_SCORE = 45;
export function isQualified(l: Lead): boolean {
  return l.score.total >= QUALIFY_MIN_SCORE && (l.emails.length > 0 || Boolean(l.phone));
}

/** One short sentence on why this business is a good prospect, e.g. "No website and only 12 reviews". */
export function whyLead(l: Lead): string {
  const year = new Date().getFullYear();
  const reasons: string[] = [];

  if (!l.website) reasons.push("No website");
  else if (l.enrich === "done" && l.audit) {
    if (!l.audit.reachable) reasons.push("Website won't load");
    else if (!l.audit.mobileReady) reasons.push("Site isn't mobile-friendly");
    else if (!l.audit.https) reasons.push("Site isn't secure");
    else if (l.audit.lastYear && l.audit.lastYear <= year - 2) reasons.push("Site looks out of date");
  }

  if (l.reviewCount === 0) reasons.push("no reviews yet");
  else if (l.rating != null && l.rating < 4.2 && l.reviewCount >= 5) reasons.push(`rated ${l.rating.toFixed(1)}`);
  else if (l.reviewCount < 30) reasons.push(`only ${l.reviewCount} review${l.reviewCount === 1 ? "" : "s"}`);

  if (!reasons.length) return "Strong online presence already";
  const [first, second] = reasons;
  const text = second ? `${first} and ${second}` : first;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
