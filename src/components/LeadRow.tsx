"use client";
import { useState } from "react";
import type { Lead } from "@/lib/types";
import { whyLead } from "@/lib/scoring";
import { ScoreRing } from "./ScoreRing";

function host(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

const BAR: Record<string, string> = { hot: "bg-hot", warm: "bg-warm", cold: "bg-cold" };
const SLOT = "min-w-[6.75rem]";

export function LeadRow({ lead, onCall, onEmail }: { lead: Lead; onCall: (l: Lead) => void; onEmail: (l: Lead) => void }) {
  const [open, setOpen] = useState(false);
  const { score } = lead;

  return (
    <article className="border-b border-mist last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 md:flex-nowrap">
        <ScoreRing score={score.total} tier={score.tier} size={52} />

        <div className="min-w-0 flex-1 basis-44">
          <h3 className="truncate font-display text-lg font-semibold leading-tight">{lead.name}</h3>
          <p className="text-sm text-pine">{whyLead(lead)}</p>
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          {lead.phone ? (
            <button type="button" className={`btn btn-primary ${SLOT}`} onClick={() => onCall(lead)} aria-label={`Call script for ${lead.name}`}>Call</button>
          ) : (
            <span className={`btn btn-quiet ${SLOT} opacity-45`} aria-disabled="true">No phone</span>
          )}

          {lead.emails.length ? (
            <button type="button" className={`btn btn-quiet ${SLOT}`} onClick={() => onEmail(lead)} aria-label={`Write email to ${lead.name}`}>Email</button>
          ) : (
            <span className={`btn btn-quiet ${SLOT} opacity-45`} aria-disabled="true">
              {lead.enrich === "pending" ? "Finding email" : "No email"}
            </span>
          )}

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} details for ${lead.name}`}
            className="ml-auto rounded-full px-3 py-2 text-sm font-medium text-pine hover:text-ink md:ml-0"
          >
            {open ? "Hide" : "Details"}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-x-10 gap-y-5 bg-white/70 px-4 py-5 md:grid-cols-2 md:pl-[5.25rem]">
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-3"><dt className="w-16 shrink-0 text-pine">Address</dt><dd>{lead.address}</dd></div>
            {lead.phone && <div className="flex gap-3"><dt className="w-16 shrink-0 text-pine">Phone</dt><dd>{lead.phone}</dd></div>}
            {lead.emails.length > 0 && <div className="flex gap-3"><dt className="w-16 shrink-0 text-pine">Email</dt><dd className="min-w-0 break-words">{lead.emails.join(", ")}</dd></div>}
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-pine">Website</dt>
              <dd>{lead.website ? <a className="font-medium text-cobalt underline-offset-2 hover:underline" href={lead.website} target="_blank" rel="noopener noreferrer">{host(lead.website)}</a> : "None"}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-pine">Reviews</dt>
              <dd>{lead.reviewCount ? `${lead.rating?.toFixed(1)} stars from ${lead.reviewCount}` : "None yet"}</dd>
            </div>
            {lead.mapsUrl && (
              <div className="pt-1"><a className="text-pine underline underline-offset-2 hover:text-ink" href={lead.mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</a></div>
            )}
            {score.angles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2" aria-label="Services to pitch">
                {score.angles.map((a) => <span key={a} className="rounded-md bg-ink/[0.07] px-2 py-0.5 text-xs font-medium">{a}</span>)}
              </div>
            )}
          </dl>

          <div className="space-y-3">
            {score.parts.map((p) => (
              <div key={p.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{p.label}</span>
                  <span className="tabular-nums text-pine">{p.points}/{p.max}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-mist" role="presentation">
                  <div className={`h-full rounded-full ${BAR[score.tier]}`} style={{ width: `${(p.points / p.max) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-sm text-pine">{p.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
