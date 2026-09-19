import type { Lead } from "./types";

/** Cells starting with = + - @ would run as formulas in Excel/Sheets - business names are untrusted input. */
function cell(v: string | number | undefined): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function leadsToCsv(leads: Lead[]): string {
  const head = ["Score", "Tier", "Business", "Email", "Phone", "Website", "Address", "Category", "Rating", "Reviews", "Pitch angles", "Google Maps"];
  const rows = leads.map((l) => [
    l.score.total, l.score.tier, l.name, l.emails.join("; "), l.phone, l.website, l.address,
    l.category, l.rating, l.reviewCount, l.score.angles.join("; "), l.mapsUrl,
  ]);
  return [head, ...rows].map((r) => r.map((c) => cell(c as string | number | undefined)).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
