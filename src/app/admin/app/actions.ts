"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { notify, type Audience } from "@/lib/app/push";
import { announcePendingPrayers, pushTextFor, syncDailyPrayers } from "@/lib/app/daily";
import { videoTitle } from "@/lib/app/youtube-videos";
import { getPublished } from "@/lib/store";
import { cleanTitle, parseYouTubeId, todayISO } from "@/lib/util";

// Server actions for the Mobile app admin pages. Every action re-checks the admin session.

async function guard() {
  if (!(await isAdmin())) throw new Error("Not signed in");
  await appReady();
  return db();
}

const s = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const n = (fd: FormData, k: string) => Number(fd.get(k));

// ---- users ----
export async function setUserRole(fd: FormData) {
  const sql = await guard();
  const role = s(fd, "role");
  if (!["member", "volunteer", "admin"].includes(role)) return;
  await sql`update app_users set role = ${role} where id = ${n(fd, "id")}`;
  revalidatePath("/admin/app/users");
}

export async function setUserBlocked(fd: FormData) {
  const sql = await guard();
  const blocked = s(fd, "blocked") === "1";
  // bump token_version so a blocked person is signed out immediately
  await sql`update app_users set blocked = ${blocked}, token_version = token_version + 1 where id = ${n(fd, "id")}`;
  revalidatePath("/admin/app/users");
}

// ---- prayer requests ----
export async function replyToRequest(fd: FormData) {
  const sql = await guard();
  const id = n(fd, "id");
  const reply = s(fd, "reply");
  const status = s(fd, "status") === "praying" ? "praying" : "answered";
  const rows = await sql`update app_prayer_requests set reply = ${reply || null}, status = ${status}, replied_at = now(), reply_seen = false where id = ${id} returning user_id`;
  if (rows.length && reply) await notify(`user:${Number(rows[0].user_id)}`, "Your prayer request 🙏", reply, { kind: "prayer-reply", id });
  revalidatePath("/admin/app/prayer-requests");
}

// ---- daily prayers ----
export async function syncNow() {
  await guard();
  const { settings } = await getPublished();
  const added = await syncDailyPrayers(settings.youtubeChannelId);
  const notified = await announcePendingPrayers();
  revalidatePath("/admin/app/daily");
  revalidatePath("/admin/app");
  return { added, notified };
}

export async function addDailyPrayer(fd: FormData) {
  const sql = await guard();
  const id = parseYouTubeId(s(fd, "url", 300));
  if (!id) throw new Error("That doesn't look like a YouTube link");
  const title = s(fd, "title", 200) || cleanTitle(await videoTitle(id));
  const forDate = /^\d{4}-\d{2}-\d{2}$/.test(s(fd, "date")) ? s(fd, "date") : todayISO();
  const sendNow = s(fd, "notify") === "1";
  const rows = await sql`insert into app_daily_prayers (video_id, title, for_date, source)
                         values (${id}, ${title}, ${forDate}, 'manual')
                         on conflict (video_id) do update set title = excluded.title, for_date = excluded.for_date, hidden = false
                         returning id`;
  if (sendNow) {
    const { title: t, body } = pushTextFor(title);
    await notify("all", t, body, { kind: "daily", id: Number(rows[0].id) });
    await sql`update app_daily_prayers set notified_at = now() where id = ${Number(rows[0].id)}`;
  }
  revalidatePath("/admin/app/daily");
}

export async function sendDailyNow(fd: FormData) {
  const sql = await guard();
  const id = n(fd, "id");
  const rows = await sql`select title from app_daily_prayers where id = ${id}`;
  if (!rows.length) return;
  const { title, body } = pushTextFor(rows[0].title as string);
  await notify("all", title, body, { kind: "daily", id });
  await sql`update app_daily_prayers set notified_at = now() where id = ${id}`;
  revalidatePath("/admin/app/daily");
}

export async function setDailyHidden(fd: FormData) {
  const sql = await guard();
  await sql`update app_daily_prayers set hidden = ${s(fd, "hidden") === "1"} where id = ${n(fd, "id")}`;
  revalidatePath("/admin/app/daily");
}

// ---- updates ----
export async function createUpdate(fd: FormData) {
  const sql = await guard();
  const title = s(fd, "title", 120);
  if (!title) throw new Error("Title is required");
  const rows = await sql`insert into app_updates (title, body, image, link) values (${title}, ${s(fd, "body", 4000)}, ${s(fd, "image", 500) || null}, ${s(fd, "link", 500) || null}) returning id`;
  if (s(fd, "notify") === "1") {
    const id = Number(rows[0].id);
    await notify("all", title, s(fd, "body", 4000) || "New update from the church", { kind: "update", id });
    await sql`update app_updates set notified_at = now() where id = ${id}`;
  }
  revalidatePath("/admin/app/updates");
}

export async function deleteUpdate(fd: FormData) {
  const sql = await guard();
  await sql`delete from app_updates where id = ${n(fd, "id")}`;
  revalidatePath("/admin/app/updates");
}

export async function sendUpdateNow(fd: FormData) {
  const sql = await guard();
  const id = n(fd, "id");
  const rows = await sql`select title, body from app_updates where id = ${id}`;
  if (!rows.length) return;
  await notify("all", rows[0].title as string, (rows[0].body as string) || "New update from the church", { kind: "update", id });
  await sql`update app_updates set notified_at = now() where id = ${id}`;
  revalidatePath("/admin/app/updates");
}

// ---- custom notification ----
export async function sendCustomNotification(fd: FormData) {
  await guard();
  const title = s(fd, "title", 100);
  const body = s(fd, "body", 300);
  if (!title) throw new Error("Title is required");
  const audience = (s(fd, "audience") === "volunteers" ? "volunteers" : "all") as Audience;
  await notify(audience, title, body, { kind: "custom" });
  revalidatePath("/admin/app/notify");
}
