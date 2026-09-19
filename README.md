# Leadsfinder

Find local businesses on Google Maps by keyword and location, pull their contact details, and rank every one out of 100 by how good a prospect it is for **reviews, website and online-presence services**.

Built with Next.js 15 (App Router), TypeScript and Tailwind. The backend is Next.js route handlers, so the whole thing deploys to Vercel as one project.

## What it does

1. **Search** - Google Places API (New) Text Search, up to 60 businesses per search.
2. **Pull details** - name, address, phone, website, rating, review count, Maps link.
3. **Look inside each website** - finds email addresses (homepage, then the contact page) and audits the site: HTTPS, mobile-friendly, stale copyright year, template builders (Wix, Weebly, ...), contact form, social links.
4. **Score out of 100** - see below.
5. **Work the list** - filter (hot / warm / cold, has email, no website), sort, save lists in the browser, export to CSV.

### Lead score

| Part | Points | Rewards |
| --- | --- | --- |
| Reachability | 30 | Email found (15), phone (10), website (5) |
| Review opportunity | 30 | Low rating (up to 15) and few reviews (up to 15) |
| Website opportunity | 30 | No website (30), or issues found on it (no HTTPS, not mobile-friendly, out-of-date footer, template builder, no contact form, no social links) |
| Established | 10 | 20+ reviews (10), 5+ reviews (5) |

70+ is **hot**, 45-69 **warm**, below 45 **cold**. A higher score means an easier and more valuable pitch. Each lead also gets suggested pitch angles (Website creation, Review recovery, Mobile fix, ...). All weights live in `src/lib/scoring.ts`.

## Run locally

```bash
npm install
cp .env.example .env.local   # add your Google key
npm run dev
```

With no `GOOGLE_PLACES_API_KEY` the app runs in **demo mode** with sample data, so you can try the whole flow first.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | For real data | Key with **Places API (New)** enabled |
| `ACCESS_CODE` | Recommended | Visitors must enter this before searching. Stops strangers spending your Google credit |

## Deploy to Vercel

1. Import `invigocode/leadsfinder` at vercel.com/new (framework is detected automatically).
2. Under **Settings -> Environment Variables** add `GOOGLE_PLACES_API_KEY` and `ACCESS_CODE`.
3. Redeploy. Every push to `main` deploys automatically.

### Getting a Google key

1. Create a project at console.cloud.google.com and enable billing (Google gives a monthly free allowance).
2. Enable **Places API (New)**.
3. Create an API key and restrict it to the Places API.
4. Set a budget alert. Each search page (20 results) is one billable request.

## Project layout

```
src/app/page.tsx            search + results UI
src/app/api/search          Google Places search
src/app/api/enrich          email + website audit for one business
src/lib/scoring.ts          the 0-100 lead score
src/lib/enrich.ts           email extraction and site audit
src/lib/safe-fetch.ts       blocks private/internal addresses (SSRF protection)
src/lib/guard.ts            access code + rate limiting
```

## Notes on outreach

Emails are read from businesses' own public websites. Before emailing anyone, check the rules where you operate (in the UK, PECR and UK GDPR: emails to sole traders and partnerships are treated as emails to individuals). Always include who you are and an easy way to opt out.

## Roadmap ideas

User accounts and billing (Supabase + Stripe), server-side saved lists, outreach templates per pitch angle, Instagram/Facebook presence check, review-text analysis, scheduled re-scans.
