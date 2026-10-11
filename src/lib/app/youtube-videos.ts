import "server-only";

// Latest uploads of the church channel, read from the public Videos tab (no API key).
// Same approach as the admin's "Sync from YouTube".

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "CONSENT=YES+cb; SOCS=CAI",
};

export type Upload = { id: string; title: string; published: string };

function collect(node: unknown, out: Upload[]) {
  if (Array.isArray(node)) return node.forEach((n) => collect(n, out));
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
    const parts: string[] = rows.flatMap((r: { metadataParts?: { text?: { content?: string } }[] }) => (r.metadataParts || []).map((p) => p.text?.content || ""));
    out.push({ id: l.contentId, title: l.metadata?.lockupMetadataViewModel?.title?.content || "", published: parts.find((p) => /ago|Streamed/.test(p)) || "" });
    return;
  }
  for (const v of Object.values(o)) collect(v, out);
}

export async function latestUploads(channelId: string): Promise<Upload[]> {
  const r = await fetch(`https://www.youtube.com/channel/${channelId}/videos`, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`YouTube returned ${r.status}`);
  const html = await r.text();
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!m) return [];
  const out: Upload[] = [];
  collect(JSON.parse(m[1]), out);
  const seen = new Set<string>();
  return out.filter((v) => v.title && !seen.has(v.id) && seen.add(v.id));
}

/** Title + video id from a pasted link (for manual entries in the admin). */
export async function videoTitle(videoId: string): Promise<string> {
  const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("Video not found (is it private?)");
  return ((await r.json()) as { title?: string }).title || "";
}
