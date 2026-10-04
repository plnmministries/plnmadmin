import type { SiteContent, Sermon, ChurchEvent } from "./types";

export const uid = (prefix = "s") => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export function getPath(obj: any, path: string): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

// Immutable set by dotted path ("items.2.title"); creates objects/arrays as needed.
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const rec = (o: any, i: number): any => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const k = keys[i];
    const isIndex = /^\d+$/.test(k);
    const base = o == null ? (isIndex ? [] : {}) : Array.isArray(o) ? [...o] : { ...o };
    base[k] = i === keys.length - 1 ? value : rec(o?.[k], i + 1);
    return base;
  };
  return rec(obj, 0);
}

export function pageHref(slug: string) {
  return slug ? `/${slug}` : "/";
}

export function ytThumb(id: string, quality: "max" | "hq" | "mq" = "hq") {
  const q = quality === "max" ? "maxresdefault" : quality === "hq" ? "hqdefault" : "mqdefault";
  return `https://i.ytimg.com/vi/${id}/${q}.jpg`;
}

export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([\w-]{11})/) ||
    s.match(/youtu\.be\/([\w-]{11})/) ||
    s.match(/youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/);
  return m ? m[1] : null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Pulls a date out of titles like "Prophetic Sunday || 27th Sep 2026" or "September 30th, 2026".
export function dateFromTitle(t: string): string {
  let m = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase()))
    return `${m[3]}-${String(MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase()))
    return `${m[3]}-${String(MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = t.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return "";
}

// Best-guess category from a video title, matching the church's naming habits.
export function categoryFromTitle(t: string): string {
  const l = t.toLowerCase();
  if (l.includes("daily word")) return "daily-word";
  if (l.includes("glory be to god") || l.includes("testimon") || l.includes("miracle")) return "testimonies";
  if (l.includes("olive oil")) return "anointing";
  if (l.includes("short message")) return "short-messages";
  if (["christmas", "new year", "watch night", "good friday", "easter", "anniversary", "years of"].some((k) => l.includes(k))) return "special-services";
  if (l.includes("prophetic sunday")) return "prophetic-sunday";
  if (l.includes("communion")) return "holy-communion";
  if (l.includes("20 min") || l.includes("20min")) return "short-sermons";
  if (l.includes("sunday") || l.includes("service live")) return "sunday-service";
  return "teaching";
}

export function cleanTitle(t: string) {
  return t
    .replace(/\s*\|\|?\s*Paralokanestham( Ministries| ministries| Church)?\s*\|*\s*$/, "")
    .replace(/^\W*🔴\s*/u, "")
    .replace(/\s*\|\|?\s*/g, " · ")
    .replace(/(\s·)+/g, " ·")
    .replace(/^[\s·]+|[\s·]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function speakerFromTitle(t: string) {
  return /prashanth/i.test(t) ? "Bro. Prashanth" : "Dr. P. Isaac";
}

export function sortedSermons(c: SiteContent): Sermon[] {
  return c.sermons.filter((s) => !s.hidden).sort((a, b) => (b.date || "0").localeCompare(a.date || "0"));
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function upcomingEvents(c: SiteContent, includePast = false): ChurchEvent[] {
  const today = todayISO();
  return c.events
    .filter((e) => !e.hidden && (includePast || (e.endDate || e.startDate) >= today))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }, locale = "en-IN") {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale, opts);
}

export function whatsappLink(number: string, text: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function isExternal(href: string) {
  return /^(https?:|mailto:|tel:)/.test(href);
}

function parseTime(t: string): [number, number] | null {
  const m = t.trim().match(/^(\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return [h, min];
}

const IST_OFFSET_MIN = 330;

// Next Sunday service start (services are in IST). Returns ms timestamp + matching label.
export function nextService(times: { label: string; time: string }[], now = Date.now()) {
  const istNow = new Date(now + IST_OFFSET_MIN * 60000); // shifted clock; read with getUTC*
  let best: { at: number; label: string; time: string } | null = null;
  for (let addDays = 0; addDays <= 7 && !best; addDays++) {
    const d = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + addDays));
    if (d.getUTCDay() !== 0) continue;
    for (const s of times) {
      const p = parseTime(s.time);
      if (!p) continue;
      const at = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), p[0], p[1]) - IST_OFFSET_MIN * 60000;
      // treat a service as "now" for 2 hours after it starts
      if (at + 2 * 3600000 > now && (!best || at < best.at)) best = { at, label: s.label, time: s.time };
    }
  }
  return best;
}
