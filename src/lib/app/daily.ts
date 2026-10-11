import "server-only";
import { db } from "../db";
import { appReady } from "./schema";
import { notify } from "./push";
import { latestUploads } from "./youtube-videos";
import { cleanTitle, dateFromTitle, todayISO } from "../util";

// Daily morning prayer = the channel's "Daily Word of God" video for the day.
// The scheduler calls syncDailyPrayers(): new matching uploads become daily prayers and
// everyone is notified once. The admin can also add one by hand (source = manual).

export const isDailyWord = (title: string) => /daily\s*word/i.test(title);

export type DailyPrayer = {
  id: number;
  video_id: string;
  title: string;
  for_date: string;
  published_at: Date;
  source: string;
  notified_at: Date | null;
  hidden: boolean;
};

export function pushTextFor(title: string, lang: "en" | "te" | "hi" = "en") {
  const t = { en: "Today's morning prayer 🙏", te: "ఈ రోజు ఉదయ ప్రార్థన 🙏", hi: "आज की सुबह की प्रार्थना 🙏" }[lang];
  return { title: t, body: cleanTitle(title) };
}

/** Adds new Daily Word uploads from YouTube (no notification yet). Returns how many were added. */
export async function syncDailyPrayers(channelId: string): Promise<number> {
  await appReady();
  const sql = db();
  const uploads = (await latestUploads(channelId)).filter((v) => isDailyWord(v.title)).slice(0, 10);
  if (!uploads.length) return 0;
  const existing = await sql`select video_id from app_daily_prayers where video_id = any(${uploads.map((u) => u.id)})`;
  const have = new Set(existing.map((r) => r.video_id as string));
  let added = 0;
  for (const u of uploads) {
    if (have.has(u.id)) continue;
    // very old videos (first run, or a re-upload) are added silently as history, not announced
    const forDate = dateFromTitle(u.title) || todayISO();
    const stale = /\b(\d+)\s*(week|month|year)s?\s+ago/i.test(u.published) || /\b([2-9]|\d{2,})\s*days?\s+ago/i.test(u.published);
    await sql`insert into app_daily_prayers (video_id, title, for_date, source, notified_at)
              values (${u.id}, ${cleanTitle(u.title)}, ${forDate}, 'auto', ${stale ? new Date() : null})
              on conflict (video_id) do nothing`;
    added++;
  }
  return added;
}

/** Sends the notification for the newest auto-synced prayer not announced yet (manual ones are sent from the admin). */
export async function announcePendingPrayers(): Promise<number> {
  await appReady();
  const sql = db();
  const pending = (await sql`select * from app_daily_prayers where notified_at is null and not hidden and source = 'auto' and published_at <= now() order by published_at desc limit 1`) as DailyPrayer[];
  let sent = 0;
  for (const p of pending) {
    // claim first so two overlapping runs never notify twice
    const claimed = await sql`update app_daily_prayers set notified_at = now() where id = ${p.id} and notified_at is null returning id`;
    if (!claimed.length) continue;
    const { title, body } = pushTextFor(p.title);
    sent += await notify("all", title, body, { kind: "daily", id: Number(p.id) });
    // older unannounced ones are skipped so a backlog never spams
    await sql`update app_daily_prayers set notified_at = now() where notified_at is null and source = 'auto' and id <> ${p.id}`;
  }
  return sent;
}
