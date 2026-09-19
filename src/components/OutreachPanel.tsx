"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead } from "@/lib/types";
import { whyLead } from "@/lib/scoring";
import {
  SERVICES, buildCallScript, buildEmail, defaultService, scriptToText,
  type EmailDraft, type Seller, type Service,
} from "@/lib/outreach";

export type OutreachTab = "call" | "email";

interface Props {
  lead: Lead;
  tab: OutreachTab;
  onTab: (t: OutreachTab) => void;
  seller: Seller;
  onSeller: (s: Seller) => void;
  hint?: string;
  edits: Record<string, EmailDraft>;
  onEdit: (key: string, draft: EmailDraft | null) => void;
  onClose: () => void;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-pine">{title}</h3>
      <div className="mt-1 text-[0.95rem] leading-relaxed">{children}</div>
    </section>
  );
}

export function OutreachPanel({ lead, tab, onTab, seller, onSeller, hint, edits, onEdit, onClose }: Props) {
  const [service, setService] = useState<Service>(() => defaultService(lead));
  const [copied, setCopied] = useState<"" | "script" | "email">("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const script = useMemo(() => buildCallScript(lead, service, seller, hint), [lead, service, seller, hint]);
  const suggested = useMemo(() => buildEmail(lead, service, seller, hint), [lead, service, seller, hint]);
  const editKey = `${lead.id}|${service}`;
  const edited = edits[editKey];
  const draft = edited ?? suggested;
  const hasPlaceholder = /\[(your [^\]]+)\]/i.test(draft.body + draft.subject);
  const to = lead.emails[0] ?? "";

  async function copy(kind: "script" | "email", text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(kind); setTimeout(() => setCopied(""), 1800); } catch { /* clipboard blocked */ }
  }

  const mailto = `mailto:${to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body.replace(/\n/g, "\r\n"))}`;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Outreach for ${lead.name}`}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-paper shadow-2xl">
        <header className="flex items-start gap-3 border-b border-mist px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-semibold">{lead.name}</h2>
            <p className="text-sm text-pine">{whyLead(lead)}</p>
          </div>
          <button ref={closeRef} onClick={onClose} className="rounded-full px-3 py-1.5 text-sm font-medium text-pine hover:text-ink" aria-label="Close">Close</button>
        </header>

        <div className="space-y-3 border-b border-mist px-5 py-3">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">You're pitching</span>
            <select value={service} onChange={(e) => setService(e.target.value as Service)} className="rounded-md border border-ink/25 bg-white px-2 py-1.5">
              {SERVICES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <details open={!seller.name || !seller.business}>
            <summary className="cursor-pointer text-sm font-medium">Your details {(!seller.name || !seller.business) && <span className="font-normal text-warm">(add these to fill in the script)</span>}</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="text-sm"><span className="sr-only">Your name</span>
                <input value={seller.name} onChange={(e) => onSeller({ ...seller, name: e.target.value })} placeholder="Your name" className="w-full rounded-md border border-ink/25 bg-white px-3 py-2" autoComplete="name" /></label>
              <label className="text-sm"><span className="sr-only">Your business</span>
                <input value={seller.business} onChange={(e) => onSeller({ ...seller, business: e.target.value })} placeholder="Your business" className="w-full rounded-md border border-ink/25 bg-white px-3 py-2" autoComplete="organization" /></label>
            </div>
          </details>
        </div>

        <div role="tablist" aria-label="Outreach type" className="flex gap-1 border-b border-mist px-5 pt-2">
          {(["call", "email"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => onTab(t)}
              className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-semibold ${tab === t ? "border-cobalt text-ink" : "border-transparent text-pine hover:text-ink"}`}>
              {t === "call" ? "Call script" : "Email"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5" role="tabpanel">
          {tab === "call" ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                {lead.phone ? (
                  <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="btn btn-primary !px-6">Call {lead.phone}</a>
                ) : <span className="text-sm text-pine">No phone number listed for this business.</span>}
                <button className="btn btn-quiet" onClick={() => copy("script", scriptToText(lead.name, service, script))}>{copied === "script" ? "Copied" : "Copy script"}</button>
              </div>

              <Block title="Before you dial">
                <ul className="list-disc space-y-1 pl-5">
                  {script.before.map((b) => <li key={b}>{b}</li>)}
                  {script.verify && <li><span className="font-medium">Check first:</span> {script.verify}</li>}
                  <li>In the UK, check the number against the TPS/CTPS register before cold calling.</li>
                </ul>
              </Block>
              <Block title="If someone else answers">{script.ifSomeoneElse}</Block>
              <Block title="Opening">{script.opening}</Block>
              <Block title="Why you're calling">{script.hook}</Block>
              <Block title="The pitch">{script.pitch}</Block>
              <Block title="Ask">{script.question}</Block>
              <Block title="Close">{script.close}</Block>
              <Block title="If you get voicemail">{script.voicemail}</Block>

              <section>
                <h3 className="text-sm font-semibold text-pine">If they say...</h3>
                <div className="mt-2 divide-y divide-mist rounded-lg border border-mist bg-white/70">
                  {[...script.serviceObjections, ...script.commonObjections].map((o) => (
                    <details key={o.q} className="group px-4 py-3">
                      <summary className="cursor-pointer font-medium">{o.q}</summary>
                      <p className="mt-2 leading-relaxed text-ink/90">{o.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              {to ? (
                <p className="text-sm"><span className="text-pine">To:</span> <span className="font-medium">{to}</span>{lead.emails.length > 1 && <span className="text-pine"> (and {lead.emails.length - 1} more found)</span>}</p>
              ) : <p className="text-sm text-pine">No email found for this business.</p>}

              <label className="block text-sm font-medium">Subject
                <input value={draft.subject} onChange={(e) => onEdit(editKey, { ...draft, subject: e.target.value })}
                  className="mt-1 w-full rounded-md border border-ink/25 bg-white px-3 py-2 font-normal" />
              </label>
              <label className="block text-sm font-medium">Message
                <textarea value={draft.body} onChange={(e) => onEdit(editKey, { ...draft, body: e.target.value })} rows={15}
                  className="mt-1 w-full resize-y rounded-md border border-ink/25 bg-white px-3 py-2 font-normal leading-relaxed" />
              </label>

              {hasPlaceholder && <p role="status" className="rounded-md border border-warm/50 bg-warm/10 px-3 py-2 text-sm">Replace the [bracketed] parts before sending. Adding your name and business above fills them in for you.</p>}
              <p className="text-sm text-pine">Edit anything you like. Your changes are kept for this lead and this service. Keep a way for people to opt out, and only email businesses where you have a lawful basis to (in the UK, sole traders and partnerships count as individuals).</p>

              <div className="flex flex-wrap gap-2">
                <a href={to ? mailto : undefined} aria-disabled={!to} className={`btn btn-primary ${to ? "" : "pointer-events-none opacity-50"}`}>Open in email app</a>
                <button className="btn btn-quiet" onClick={() => copy("email", `Subject: ${draft.subject}\n\n${draft.body}`)}>{copied === "email" ? "Copied" : "Copy email"}</button>
                {edited && <button className="btn btn-quiet" onClick={() => onEdit(editKey, null)}>Reset to suggested</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
