"use client";
import { useState } from "react";
import type { Lead } from "@/lib/types";
import { ScoreRing, TIER_LABEL } from "./ScoreRing";

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

const BAR: Record<string, string> = { hot: "bg-hot", warm: "bg-warm", cold: "bg-cold" };

export function LeadRow({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const { score } = lead;

  return (
    <article className="border-b border-mist last:border-b-0">
      <div className="grid gap-x-6 gap-y-3 px-4 py-4 md:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1.2fr)_8rem] md:items-start">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} score breakdown for ${lead.name}`}
          className="flex items-center gap-3 text-left md:block"
        >
          <ScoreRing score={score.total} tier={score.tier} />
          <span className="text-xs font-medium text-pine md:mt-1 md:block md:text-center">
            {TIER_LABEL[score.tier]}
            <span className="md:hidden"> - tap for breakdown</span>
          </span>
        </button>

        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-tight">{lead.name}</h3>
          <p className="mt-0.5 text-sm text-pine">{[lead.category, lead.address].filter(Boolean).join(" - ")}</p>
          {score.angles.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggested pitch angles">
              {score.angles.map((a) => (
                <li key={a} className="rounded-md bg-ink/[0.07] px-2 py-0.5 text-xs font-medium">{a}</li>
              ))}
            </ul>
          )}
        </div>

        <dl className="min-w-0 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-pine">Email</dt>
            <dd className="min-w-0 truncate">
              {lead.emails.length ? (
                <a className="font-medium text-cobalt underline-offset-2 hover:underline" href={`mailto:${lead.emails[0]}`}>{lead.emails[0]}</a>
              ) : lead.enrich === "pending" ? (
                <span className="text-pine">Checking site...</span>
              ) : (
                <span className="text-pine">{lead.website ? "Not found" : "No website"}</span>
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-pine">Phone</dt>
            <dd>{lead.phone ? <a className="font-medium text-cobalt underline-offset-2 hover:underline" href={`tel:${lead.phone.replace(/\s/g, "")}`}>{lead.phone}</a> : <span className="text-pine">None listed</span>}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-pine">Site</dt>
            <dd className="min-w-0 truncate">
              {lead.website ? <a className="font-medium text-cobalt underline-offset-2 hover:underline" href={lead.website} target="_blank" rel="noopener noreferrer">{host(lead.website)}</a> : <span className="font-medium text-hot">None - opportunity</span>}
            </dd>
          </div>
        </dl>

        <div className="text-sm md:text-right">
          {lead.reviewCount > 0 ? (
            <>
              <p className="font-display text-lg font-semibold tabular-nums">{lead.rating?.toFixed(1)} <span aria-hidden className="text-warm">&#9733;</span></p>
              <p className="text-pine">{lead.reviewCount} reviews</p>
            </>
          ) : (
            <p className="font-medium text-hot">No reviews yet</p>
          )}
          {lead.mapsUrl && (
            <a className="mt-1 inline-block text-xs text-pine underline underline-offset-2 hover:text-ink" href={lead.mapsUrl} target="_blank" rel="noopener noreferrer">Open in Maps</a>
          )}
        </div>
      </div>

      {open && (
        <div className="grid gap-x-8 gap-y-3 bg-white/70 px-4 py-4 sm:grid-cols-2 md:pl-[5.5rem]">
          {score.parts.map((p) => (
            <div key={p.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{p.label}</span>
                <span className="tabular-nums text-pine">{p.points}/{p.max}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-mist" role="presentation">
                <div className={`h-full rounded-full ${BAR[score.tier]}`} style={{ width: `${(p.points / p.max) * 100}%` }} />
              </div>
              <p className="mt-1 text-sm text-pine">{p.note}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
