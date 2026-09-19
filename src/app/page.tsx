"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EnrichResult, Lead, PlaceLead, SavedSearch } from "@/lib/types";
import { buildLead, isQualified } from "@/lib/scoring";
import { downloadCsv, leadsToCsv } from "@/lib/csv";
import { LeadRow } from "@/components/LeadRow";
import { OutreachPanel, type OutreachTab } from "@/components/OutreachPanel";
import type { EmailDraft, Seller } from "@/lib/outreach";

const SAVED_KEY = "leadsfinder:saved";
const CODE_KEY = "leadsfinder:code";
const SELLER_KEY = "leadsfinder:seller";
const CONCURRENCY = 4;

type Sort = "score" | "reviews" | "name";

export default function Home() {
  const [config, setConfig] = useState<{ needsCode: boolean; demo: boolean } | null>(null);
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [max, setMax] = useState(40);
  const [checkSites, setCheckSites] = useState(true);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [searched, setSearched] = useState<{ query: string; location: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [qualifiedOnly, setQualifiedOnly] = useState(true);
  const [needEmail, setNeedEmail] = useState(false);
  const [noSite, setNoSite] = useState(false);
  const [sort, setSort] = useState<Sort>("score");
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const runId = useRef(0);

  const [seller, setSeller] = useState<Seller>({ name: "", business: "" });
  const [open, setOpen] = useState<{ id: string; tab: OutreachTab } | null>(null);
  const [edits, setEdits] = useState<Record<string, EmailDraft>>({});

  // ---- bootstrap
  useEffect(() => {
    setCode(sessionStorage.getItem(CODE_KEY) ?? "");
    try { const s = JSON.parse(localStorage.getItem(SELLER_KEY) ?? "null"); if (s) setSeller({ name: String(s.name ?? ""), business: String(s.business ?? "") }); } catch { /* ignore */ }
    try { setSaved(JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]")); } catch { /* ignore corrupt storage */ }
    fetch("/api/config").then((r) => r.json()).then(setConfig).catch(() => setConfig({ needsCode: false, demo: false }));
  }, []);

  const api = useCallback(async <T,>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-code": code },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      sessionStorage.removeItem(CODE_KEY);
      setCode("");
      setCodeError("That code wasn't accepted.");
      throw new Error("access");
    }
    if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
    return data as T;
  }, [code]);

  // ---- website enrichment queue
  const enrichAll = useCallback(async (places: PlaceLead[], demo: boolean, id: number) => {
    const queue = places.filter((p) => p.website);
    if (!queue.length) return;
    setProgress({ done: 0, total: queue.length });
    let done = 0;
    const worker = async () => {
      for (;;) {
        const p = queue.shift();
        if (!p || runId.current !== id) return;
        let result: EnrichResult | null = null;
        try { result = await api<EnrichResult>("/api/enrich", { id: p.id, website: p.website, demo }); } catch { /* mark failed below */ }
        if (runId.current !== id) return;
        setLeads((cur) => cur.map((l) => (l.id === p.id
          ? buildLead(p, result ? { emails: result.emails, audit: result.audit, enrich: "done" } : { enrich: "failed" })
          : l)));
        done += 1;
        setProgress({ done, total: places.filter((x) => x.website).length });
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (runId.current === id) setProgress(null);
  }, [api]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !location.trim() || loading) return;
    const id = ++runId.current;
    setLoading(true); setError(""); setProgress(null); setLeads([]);
    setQualifiedOnly(true); setNeedEmail(false); setNoSite(false); setSort("score");
    try {
      const data = await api<{ leads: PlaceLead[]; demo: boolean }>("/api/search", { query, location, max });
      if (runId.current !== id) return;
      const withState = data.leads.map((p) => buildLead(p, { enrich: checkSites && p.website ? "pending" : "idle" }));
      setLeads(withState);
      setSearched({ query: query.trim(), location: location.trim() });
      if (!data.leads.length) setError("No businesses found. Try a broader keyword or a nearby town.");
      setLoading(false);
      if (checkSites) void enrichAll(data.leads, data.demo, id);
    } catch (err) {
      if ((err as Error).message !== "access") setError((err as Error).message);
      setLoading(false);
    }
  }

  function updateSeller(s: Seller) {
    setSeller(s);
    try { localStorage.setItem(SELLER_KEY, JSON.stringify(s)); } catch { /* storage full or blocked */ }
  }
  function setEdit(key: string, d: EmailDraft | null) {
    setEdits((cur) => { const next = { ...cur }; if (d) next[key] = d; else delete next[key]; return next; });
  }
  const openLead = open ? leads.find((l) => l.id === open.id) : undefined;
  const closePanel = useCallback(() => setOpen(null), []);

  // ---- derived list
  const enriching = progress !== null;
  const hasResults = leads.length > 0;
  const qualifiedCount = useMemo(() => leads.filter(isQualified).length, [leads]);

  const visible = useMemo(() => {
    let out = leads.filter((l) =>
      (!qualifiedOnly || isQualified(l)) && (!needEmail || l.emails.length > 0) && (!noSite || !l.website));
    // Keep Google's order while checks run so rows don't jump around; sort once they finish.
    if (sort === "score" && !enriching) out = [...out].sort((a, b) => b.score.total - a.score.total);
    if (sort === "reviews") out = [...out].sort((a, b) => a.reviewCount - b.reviewCount);
    if (sort === "name") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [leads, qualifiedOnly, needEmail, noSite, sort, enriching]);

  // ---- saved lists
  function persist(next: SavedSearch[]) {
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { setError("Couldn't save: browser storage is full."); }
  }
  function saveCurrent() {
    if (!searched || !leads.length) return;
    persist([{ id: String(Date.now()), ...searched, savedAt: new Date().toISOString(), leads }, ...saved].slice(0, 15));
  }
  function loadSaved(s: SavedSearch) {
    runId.current++;
    setProgress(null); setError("");
    setLeads(s.leads); setSearched({ query: s.query, location: s.location });
    setQuery(s.query); setLocation(s.location);
  }
  function exportCsv() {
    const slug = `${searched?.query ?? "leads"}-${searched?.location ?? ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    downloadCsv(`leadsfinder-${slug}.csv`, leadsToCsv(visible, seller, searched?.query));
  }

  // ---- access gate
  if (!config) return <main className="grid min-h-screen place-items-center text-pine">Loading...</main>;
  if (config.needsCode && !code) {
    return (
      <main className="mx-auto grid min-h-screen max-w-md content-center gap-4 px-5">
        <h1 className="font-display text-4xl font-semibold">Leadsfinder</h1>
        <p className="text-pine">Enter your access code to start searching.</p>
        <form onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem(CODE_KEY, codeInput); setCode(codeInput); setCodeError(""); }} className="flex gap-2">
          <label className="sr-only" htmlFor="code">Access code</label>
          <input id="code" type="password" autoComplete="off" value={codeInput} onChange={(e) => setCodeInput(e.target.value)}
            className="min-w-0 flex-1 rounded-full border border-ink/25 bg-white px-4 py-2.5" placeholder="Access code" />
          <button className="btn btn-primary" disabled={!codeInput}>Continue</button>
        </form>
        {codeError && <p role="alert" className="text-sm text-red-700">{codeError}</p>}
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <header className="flex items-center justify-between py-5">
        <span className="font-display text-xl font-bold tracking-tight">Leadsfinder</span>
        {enriching && <span className="text-sm text-pine">Checking websites...</span>}
      </header>

      {config.demo && (
        <p role="status" className="mb-6 rounded-lg border border-warm/50 bg-warm/10 px-4 py-2.5 text-sm">
          Demo mode: results are sample data. Add <code className="font-semibold">GOOGLE_PLACES_API_KEY</code> in your Vercel project settings to search real Google Maps businesses.
        </p>
      )}

      <form onSubmit={onSearch} className={hasResults ? "pt-2" : "pt-6 md:pt-14"}>
        <h1 className={`font-display font-semibold tracking-tight leading-[1.15] ${hasResults ? "text-3xl sm:text-4xl" : "text-[2.6rem] sm:text-6xl md:text-7xl"}`}>
          <label htmlFor="q">Find</label>{" "}
          <input id="q" className="sentence-input text-cobalt" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="plumbers" maxLength={80} autoComplete="off" required />
          {hasResults ? " " : <br />}
          <label htmlFor="loc">near</label>{" "}
          <input id="loc" className="sentence-input text-cobalt" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Leeds, UK" maxLength={80} autoComplete="off" required />
        </h1>

        <div className={`flex flex-wrap items-center gap-x-6 gap-y-4 ${hasResults ? "mt-5" : "mt-8"}`}>
          <button className="btn btn-primary !px-7 !py-3 !text-base" disabled={loading}>{loading ? "Searching Google Maps..." : "Find leads"}</button>
          <label className="flex items-center gap-2 text-sm">
            Up to
            <select value={max} onChange={(e) => setMax(Number(e.target.value))} className="rounded-md border border-ink/25 bg-white px-2 py-1.5">
              <option value={20}>20</option><option value={40}>40</option><option value={60}>60</option>
            </select>
            businesses
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={checkSites} onChange={(e) => setCheckSites(e.target.checked)} className="h-4 w-4 accent-cobalt" />
            Check websites for emails and quality issues
          </label>
        </div>
      </form>

      {saved.length > 0 && (
        <section className="mt-8" aria-label="Saved lists">
          <h2 className="mb-2 text-sm font-semibold text-pine">Saved lists</h2>
          <ul className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <li key={s.id} className="flex overflow-hidden rounded-full border border-ink/20 bg-white/60">
                <button className="px-3 py-1 text-sm hover:bg-white" onClick={() => loadSaved(s)}>
                  {s.query} in {s.location} <span className="text-pine">({s.leads.length})</span>
                </button>
                <button className="border-l border-ink/15 px-2.5 text-pine hover:bg-white hover:text-ink" aria-label={`Delete saved list ${s.query} in ${s.location}`}
                  onClick={() => persist(saved.filter((x) => x.id !== s.id))}>&times;</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p role="alert" className="mt-8 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900">{error}</p>}

      {leads.length > 0 && searched && (
        <section className="mt-10" aria-label="Results">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">
                {leads.length} {searched.query} near {searched.location}
              </h2>
              <p className="mt-1 text-sm text-pine">{qualifiedCount} qualified: good score and a way to contact them</p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-quiet" onClick={saveCurrent}>Save list</button>
              <button className="btn btn-primary" onClick={exportCsv} disabled={!visible.length}>Export {visible.length} to CSV</button>
            </div>
          </div>

          {progress && (
            <div className="mt-4" role="status">
              <div className="h-1.5 overflow-hidden rounded-full bg-mist">
                <div className="h-full bg-cobalt transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-sm text-pine">Checking websites: {progress.done} of {progress.total}. The list sorts by score when this finishes.</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
            <button className="chip" aria-pressed={qualifiedOnly} onClick={() => setQualifiedOnly((v) => !v)}>Qualified only</button>
            <button className="chip" aria-pressed={needEmail} onClick={() => setNeedEmail((v) => !v)}>Has email</button>
            <button className="chip" aria-pressed={noSite} onClick={() => setNoSite((v) => !v)}>No website</button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-md border border-ink/25 bg-white px-2 py-1.5">
                <option value="score">Lead score</option>
                <option value="reviews">Fewest reviews</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-mist bg-paper">
            {visible.length ? visible.map((l) => <LeadRow key={l.id} lead={l} onCall={(x) => setOpen({ id: x.id, tab: "call" })} onEmail={(x) => setOpen({ id: x.id, tab: "email" })} />) : (
              <div className="px-4 py-10 text-center text-pine"><p>No leads match these filters.</p>{qualifiedOnly && <button className="btn btn-quiet mt-3" onClick={() => setQualifiedOnly(false)}>Show all {leads.length} businesses</button>}</div>
            )}
          </div>

          <details className="mt-6 max-w-2xl text-sm text-pine">
            <summary className="cursor-pointer font-medium text-ink">How the score works</summary>
            <p className="mt-2">Out of 100: 30 for reachability (email, phone, website), 30 for review opportunity, 30 for website opportunity, and 10 for how established the business is. Higher means an easier, more valuable pitch. Qualified means 45 or more with a phone number or email. Open Details on any lead for its breakdown.</p>
          </details>
        </section>
      )}
      {openLead && open && (
        <OutreachPanel key={openLead.id} lead={openLead} tab={open.tab} onTab={(t) => setOpen({ id: openLead.id, tab: t })}
          seller={seller} onSeller={updateSeller} hint={searched?.query} edits={edits} onEdit={setEdit} onClose={closePanel} />
      )}
    </div>
  );
}
