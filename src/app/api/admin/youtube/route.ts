import { isAdmin, unauthorized } from "@/lib/admin-guard";
import { getDraft } from "@/lib/store";
import { categoryFromTitle, cleanTitle, dateFromTitle, parseYouTubeId, speakerFromTitle } from "@/lib/util";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36";

function guess(id: string, rawTitle: string, published = "") {
  return {
    id,
    title: cleanTitle(rawTitle),
    date: dateFromTitle(rawTitle),
    category: categoryFromTitle(rawTitle),
    speaker: speakerFromTitle(rawTitle),
    published,
  };
}

type Found = { id: string; title: string; published: string };

// Walks YouTube's ytInitialData for video tiles (handles both old and new tile formats).
function collectVideos(node: unknown, out: Found[]) {
  if (Array.isArray(node)) return node.forEach((n) => collectVideos(n, out));
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (o.videoRenderer?.videoId) {
    const v = o.videoRenderer;
    out.push({ id: v.videoId, title: (v.title?.runs || []).map((r: { text: string }) => r.text).join(""), published: v.publishedTimeText?.simpleText || "" });
    return;
  }
  if (o.lockupViewModel?.contentId && o.lockupViewModel.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
    const l = o.lockupViewModel;
    const rows = l.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
    const parts = rows.flatMap((r: { metadataParts?: { text?: { content?: string } }[] }) => (r.metadataParts || []).map((p) => p.text?.content || ""));
    out.push({ id: l.contentId, title: l.metadata?.lockupMetadataViewModel?.title?.content || "", published: parts.find((p: string) => /ago|Streamed/.test(p)) || "" });
    return;
  }
  for (const v of Object.values(o)) collectVideos(v, out);
}

async function channelTab(channelId: string, tab: "videos" | "streams") {
  const res = await fetch(`https://www.youtube.com/channel/${channelId}/${tab}`, { headers: { "User-Agent": UA, "Accept-Language": "en-US" }, cache: "no-store" });
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!m) return [];
  const out: Found[] = [];
  collectVideos(JSON.parse(m[1]), out);
  return out;
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const url = new URL(req.url);

  const lookup = url.searchParams.get("lookup");
  if (lookup) {
    const id = parseYouTubeId(lookup);
    if (!id) return Response.json({ error: "That doesn't look like a YouTube link" }, { status: 400 });
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    if (!r.ok) return Response.json({ error: "Video not found (is it private?)" }, { status: 404 });
    const data = await r.json();
    return Response.json(guess(id, data.title || ""));
  }

  // Latest uploads + live streams from the church channel, newest first.
  const { content } = await getDraft();
  const ch = content.settings.youtubeChannelId;
  try {
    const [streams, videos] = await Promise.all([channelTab(ch, "streams"), channelTab(ch, "videos")]);
    const seen = new Set<string>();
    const items = [...streams, ...videos]
      .filter((v) => v.title && !seen.has(v.id) && seen.add(v.id))
      .map((v) => guess(v.id, v.title, v.published));
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Couldn't reach YouTube. Try again in a moment." }, { status: 502 });
  }
}
