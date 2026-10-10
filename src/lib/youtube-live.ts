// Live status of the church's YouTube channel, read from public YouTube pages (no API key).
//   • Live now: /channel/<id>/live ("isLiveNow") or a tile with the LIVE badge in the Live tab.
//   • Scheduled streams: tiles in the Live tab marked "Scheduled for…" / "… waiting". The tile's
//     time text is in US Pacific time for anonymous requests, so the exact start comes from each
//     video's own page (liveBroadcastDetails.startTimestamp, UTC).
// YouTube sometimes shows consent/bot pages to servers, hence the consent cookie and two live checks.

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "CONSENT=YES+cb; SOCS=CAI",
};

export type NextLive = { videoId: string; title: string; startsAt: string };
export type LiveStatus = { live: boolean; videoId: string | null; source?: string; next: NextLive | null };

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

type Tile = { id: string; json: string };

function tilesFromStreamsPage(html: string): Tile[] {
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!m) return [];
  const out: Tile[] = [];
  const walk = (o: unknown): void => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    const rec = o as Record<string, unknown>;
    const tile = (rec.lockupViewModel ?? rec.videoRenderer ?? rec.gridVideoRenderer) as Record<string, unknown> | undefined;
    if (tile) {
      const id = (tile.contentId ?? tile.videoId) as string | undefined;
      if (id && /^[\w-]{11}$/.test(id)) out.push({ id, json: JSON.stringify(tile) });
      return;
    }
    Object.values(rec).forEach(walk);
  };
  try {
    walk(JSON.parse(m[1]));
  } catch {
    return [];
  }
  return out;
}

const isLiveTile = (t: Tile) => /BADGE_STYLE_LIVE|BADGE_STYLE_TYPE_LIVE_NOW/.test(t.json) || /\d[\d,.]*\s*[KM]?\s+watching/i.test(t.json);
const isUpcomingTile = (t: Tile) => /Scheduled for|upcomingEventData|BADGE_STYLE_TYPE_UPCOMING|\d[\d,.]*\s*[KM]?\s+waiting/i.test(t.json);

/** The tile with the LIVE badge in the channel's Live tab. */
export function liveFromStreamsPage(html: string): string | null {
  return tilesFromStreamsPage(html).find(isLiveTile)?.id ?? null;
}

/** Ids of streams scheduled for later (Live tab), in page order. */
export function upcomingFromStreamsPage(html: string): string[] {
  return tilesFromStreamsPage(html)
    .filter((t) => isUpcomingTile(t) && !isLiveTile(t))
    .map((t) => t.id);
}

/** Exact start time + title from a scheduled video's watch page. */
export function scheduledFromWatchPage(html: string): { startsAt: string; title: string } | null {
  if (!/"isUpcoming":\s*true/.test(html)) return null;
  const ts = html.match(/"liveBroadcastDetails":\{[^}]*"startTimestamp":"([^"]+)"/)?.[1];
  const unix = html.match(/"scheduledStartTime":"(\d+)"/)?.[1];
  const startsAt = ts ? new Date(ts) : unix ? new Date(Number(unix) * 1000) : null;
  if (!startsAt || isNaN(startsAt.getTime())) return null;
  const title = (html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return { startsAt: startsAt.toISOString(), title };
}

// scheduled streams change rarely; look them up every 5 minutes, not every request
let upcomingCache: { at: number; channel: string; list: NextLive[] } | null = null;

async function scheduledStreams(channelId: string, streamsHtml: string): Promise<NextLive[]> {
  if (upcomingCache && upcomingCache.channel === channelId && Date.now() - upcomingCache.at < 5 * 60_000) return upcomingCache.list;
  const ids = upcomingFromStreamsPage(streamsHtml).slice(0, 6);
  const found = await Promise.all(
    ids.map(async (id) => {
      const s = scheduledFromWatchPage(await page(`https://www.youtube.com/watch?v=${id}`).catch(() => ""));
      return s ? { videoId: id, ...s } : null;
    }),
  );
  const list = found.filter((x): x is NextLive => !!x).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  upcomingCache = { at: Date.now(), channel: channelId, list };
  return list;
}

export async function getLiveStatus(channelId: string): Promise<LiveStatus> {
  const [livePage, streams] = await Promise.all([
    page(`https://www.youtube.com/channel/${channelId}/live`).catch(() => ""),
    page(`https://www.youtube.com/channel/${channelId}/streams`).catch(() => ""),
  ]);
  const a = liveFromLivePage(livePage);
  const b = a ? null : liveFromStreamsPage(streams);
  const liveId = a || b;
  // only the next scheduled stream matters; keep one that is running late (up to 30 min past its start)
  const cutoff = Date.now() - 30 * 60_000;
  const next = (await scheduledStreams(channelId, streams).catch(() => [])).find((s) => s.videoId !== liveId && new Date(s.startsAt).getTime() > cutoff) ?? null;
  return { live: !!liveId, videoId: liveId, source: a ? "live-page" : b ? "streams-tab" : undefined, next };
}

/** Back-compat helper used elsewhere: just the live video, if any. */
export async function detectLive(channelId: string): Promise<{ videoId: string; source: string } | null> {
  const s = await getLiveStatus(channelId);
  return s.live && s.videoId ? { videoId: s.videoId, source: s.source || "" } : null;
}
