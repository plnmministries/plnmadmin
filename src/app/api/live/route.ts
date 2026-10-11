import { getPublished } from "@/lib/store";
import { getLiveStatus, type LiveStatus } from "@/lib/youtube-live";

// Is the church's YouTube channel live, and when is the next scheduled stream?
// Cached in memory for a minute, or 15 s when a scheduled stream is about to start so the
// site switches to LIVE NOW quickly (scheduled streams themselves are looked up every 5 minutes).
let cache: { at: number; ttl: number; data: LiveStatus } | null = null;

function ttlFor(d: LiveStatus) {
  const startsIn = d.next ? new Date(d.next.startsAt).getTime() - Date.now() : Infinity;
  return !d.live && Math.abs(startsIn) < 15 * 60_000 ? 15_000 : 60_000;
}

export async function GET() {
  if (cache && Date.now() - cache.at < cache.ttl) return Response.json(cache.data);
  const { settings } = await getPublished();
  let data: LiveStatus = { live: false, videoId: null, next: null };
  try {
    data = await getLiveStatus(settings.youtubeChannelId);
  } catch {
    // network hiccup: report not live
  }
  cache = { at: Date.now(), ttl: ttlFor(data), data };
  return Response.json(data);
}
