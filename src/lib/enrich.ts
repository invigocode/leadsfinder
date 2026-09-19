import { safeFetchHtml } from "./safe-fetch";
import type { EnrichResult, SiteAudit } from "./types";

const EMAIL_RE = /[a-z0-9._%+-]{1,64}@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const JUNK_TLDS = /\.(png|jpe?g|gif|svg|webp|css|js|woff2?|ico|avif)$/i;
const JUNK_DOMAINS = /(sentry|wixpress|example\.|domain\.com|email\.com|yourdomain|schema\.org|w3\.org)/i;

const BUILDERS: [RegExp, string][] = [
  [/wixstatic\.com|static\.parastorage\.com/i, "Wix"],
  [/squarespace\.com|static1\.squarespace/i, "Squarespace"],
  [/weebly\.com|editmysite\.com/i, "Weebly"],
  [/godaddy\.com\/websites|wsimg\.com/i, "GoDaddy"],
];

const SOCIAL_HOSTS = ["facebook.com", "instagram.com", "linkedin.com", "tiktok.com", "twitter.com", "x.com", "youtube.com"];

function extractEmails(html: string, siteHost: string): string[] {
  const found = new Set<string>();
  // mailto links first (highest signal), then plain text
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) found.add(decodeURIComponent(m[1]).toLowerCase());
  for (const m of html.matchAll(EMAIL_RE)) found.add(m[0].toLowerCase());

  const clean = [...found].filter((e) => !JUNK_TLDS.test(e) && !JUNK_DOMAINS.test(e) && !e.startsWith("u00"));
  const root = siteHost.replace(/^www\./, "");
  // same-domain addresses are almost always the right ones - list them first
  clean.sort((a, b) => Number(b.endsWith(root)) - Number(a.endsWith(root)));
  return clean.slice(0, 5);
}

function findContactUrl(html: string, base: string): string | null {
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["'][^>]*>/gi)) {
    const href = m[1];
    if (/contact|get-in-touch|enquir/i.test(href) && !/^(mailto|tel|javascript):/i.test(href)) {
      try {
        const u = new URL(href, base);
        if (u.hostname === new URL(base).hostname) return u.toString();
      } catch { /* ignore bad href */ }
    }
  }
  return null;
}

function auditHtml(html: string, finalUrl: string): SiteAudit {
  const lower = html.toLowerCase();
  const years = [...html.matchAll(/(?:©|&copy;|copyright)[^<]{0,40}?(20\d{2}|19\d{2})/gi)].map((m) => Number(m[1]));
  const socials = SOCIAL_HOSTS.filter((h) => lower.includes(`${h}/`)).map((h) => h.replace(".com", ""));
  return {
    reachable: true,
    https: finalUrl.startsWith("https:"),
    mobileReady: /<meta[^>]+name=["']viewport["']/i.test(html),
    lastYear: years.length ? Math.max(...years) : undefined,
    builder: BUILDERS.find(([re]) => re.test(html))?.[1],
    hasContactForm: /<form[\s\S]{0,4000}?(type=["']email["']|<textarea)/i.test(html),
    socials: Array.from(new Set(socials)),
  };
}

export async function enrichWebsite(website: string): Promise<EnrichResult> {
  try {
    const home = await safeFetchHtml(website);
    const host = new URL(home.url).hostname;
    let emails = extractEmails(home.html, host);
    const audit = auditHtml(home.html, home.url);

    if (emails.length === 0) {
      const contactUrl = findContactUrl(home.html, home.url);
      if (contactUrl) {
        try {
          const contact = await safeFetchHtml(contactUrl, 5000);
          emails = extractEmails(contact.html, host);
          if (!audit.hasContactForm) audit.hasContactForm = auditHtml(contact.html, contact.url).hasContactForm;
        } catch { /* contact page is a bonus */ }
      }
    }
    return { emails, audit };
  } catch {
    return {
      emails: [],
      audit: { reachable: false, https: false, mobileReady: false, hasContactForm: false, socials: [] },
    };
  }
}
