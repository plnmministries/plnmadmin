import { getPublished } from "@/lib/store";

import { detectLive } from "@/lib/youtube-live";

// Is the YouTube channel live right now? Cached in memory for a minute.
type Live = { live: boolean; videoId: string | null; source?: string };
let cache: { at: number; data: Live } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 60_000) return Response.json(cache.data);
  const { settings } = await getPublished();
  let data: Live = { live: false, videoId: null };
  try {
    const hit = await detectLive(settings.youtubeChannelId);
    if (hit) data = { live: true, videoId: hit.videoId, source: hit.source };
  } catch {
    // network hiccup: report not live
  }
  cache = { at: Date.now(), data };
  return Response.json(data);
}
