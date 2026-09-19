import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  return true;
}

/** Only public http(s) hosts are allowed - business websites should never resolve to internal addresses. */
async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Blocked protocol");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Blocked port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Blocked address");
    return url;
  }
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Blocked host");
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("Blocked address");
  return url;
}

export interface FetchedPage {
  url: string;
  html: string;
}

export async function safeFetchHtml(startUrl: string, timeoutMs = 6000): Promise<FetchedPage> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; LeadsfinderBot/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect without location");
      current = new URL(loc, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("xhtml")) throw new Error("Not HTML");

    const reader = res.body?.getReader();
    if (!reader) return { url: url.toString(), html: "" };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.byteLength;
    }
    reader.cancel().catch(() => {});
    return { url: url.toString(), html: Buffer.concat(chunks).toString("utf8") };
  }
  throw new Error("Too many redirects");
}
