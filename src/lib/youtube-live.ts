// Detects whether the church's YouTube channel is live right now.
// Two independent checks, because YouTube sometimes serves consent/bot pages to servers:
//   1. /channel/<id>/live  → canonical watch URL + "isLiveNow":true
//   2. /channel/<id>/streams → a tile carrying the LIVE badge / "watching" count

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  // skip the EU/consent interstitial that YouTube shows to some server IPs
  Cookie: "CONSENT=YES+cb; SOCS=CAI",
};

async function page(url: string) {
  const r = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(8000) });
  return r.ok ? r.text() : "";
}

export function liveFromLivePage(html: string): string | null {
  const canonical = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
  if (!canonical) return null;
  const live = /"isLiveNow":\s*true/.test(html) || (/"isLive":\s*true/.test(html) && !/"isUpcoming":\s*true/.test(html));
  return live ? canonical[1] : null;
}

/** Finds a tile with the LIVE badge in the channel's Live tab (ytInitialData). */
export function liveFromStreamsPage(html: string): string | null {
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!m) return null;
  let found: string | null = null;
  const walk = (o: unknown): void => {
    if (found || !o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    const rec = o as Record<string, unknown>;
    const tile = (rec.lockupViewModel ?? rec.videoRenderer ?? rec.gridVideoRenderer) as Record<string, unknown> | undefined;
    if (tile) {
      const id = (tile.contentId ?? tile.videoId) as string | undefined;
      const s = JSON.stringify(tile);
      if (id && /^[\w-]{11}$/.test(id) && (/BADGE_STYLE_LIVE|BADGE_STYLE_TYPE_LIVE_NOW/.test(s) || /\d[\d,.]*\s*[KM]?\s+watching/i.test(s))) {
        found = id;
        return;
      }
    }
    Object.values(rec).forEach(walk);
  };
  try {
    walk(JSON.parse(m[1]));
  } catch {
    return null;
  }
  return found;
}

export async function detectLive(channelId: string): Promise<{ videoId: string; source: string } | null> {
  const [livePage, streams] = await Promise.allSettled([page(`https://www.youtube.com/channel/${channelId}/live`), page(`https://www.youtube.com/channel/${channelId}/streams`)]);
  const a = livePage.status === "fulfilled" ? liveFromLivePage(livePage.value) : null;
  if (a) return { videoId: a, source: "live-page" };
  const b = streams.status === "fulfilled" ? liveFromStreamsPage(streams.value) : null;
  return b ? { videoId: b, source: "streams-tab" } : null;
}
