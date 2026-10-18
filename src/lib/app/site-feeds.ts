import "server-only";

// The app reads its feeds (daily prayers + Word for today, updates) from the public site, which caches them
// for up to an hour. After changing them here, ask the site to drop those caches so phones see it at once.
// Needs SITE_URL and REVALIDATE_SECRET (the same secret the site has). Failing quietly only means the change
// shows within the hour instead of immediately.
export async function refreshAppFeeds(...tags: ("app-daily" | "app-updates")[]) {
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (!site || !secret || !tags.length) return;
  const q = tags.map((t) => `tag=${t}`).join("&");
  await fetch(`${site}/api/revalidate?${q}`, { method: "POST", headers: { "x-revalidate-secret": secret }, signal: AbortSignal.timeout(5000) }).catch((e) =>
    console.warn("[admin] couldn't refresh the app feeds:", (e as Error).message),
  );
}
