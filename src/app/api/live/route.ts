import { getPublished } from "@/lib/store";
import { getLiveStatus, type LiveStatus } from "@/lib/youtube-live";

// Is the church's YouTube channel live, and when is the next scheduled stream?
// Cached in memory for a minute (scheduled streams are looked up every 5 minutes).
let cache: { at: number; data: LiveStatus } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 60_000) return Response.json(cache.data);
  const { settings } = await getPublished();
  let data: LiveStatus = { live: false, videoId: null, next: null };
  try {
    data = await getLiveStatus(settings.youtubeChannelId);
  } catch {
    // network hiccup: report not live
  }
  cache = { at: Date.now(), data };
  return Response.json(data);
}
