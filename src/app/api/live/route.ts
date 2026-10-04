import { getPublished } from "@/lib/store";

// Is the YouTube channel live right now? Cached in memory for a minute.
let cache: { at: number; data: { live: boolean; videoId: string | null } } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 60_000) return Response.json(cache.data);
  const { settings } = await getPublished();
  let data = { live: false, videoId: null as string | null };
  try {
    const res = await fetch(`https://www.youtube.com/channel/${settings.youtubeChannelId}/live`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36", "Accept-Language": "en-US" },
      cache: "no-store",
    });
    const html = await res.text();
    const canonical = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
    const live = /"isLiveNow":true/.test(html) || /"isLive":true/.test(html);
    if (canonical && live) data = { live: true, videoId: canonical[1] };
  } catch {
    // network hiccup: report not live
  }
  cache = { at: Date.now(), data };
  return Response.json(data);
}
