import "server-only";
import { db } from "../db";
import { appReady } from "./schema";

// Push notifications through Expo's push service (free). Android delivery needs FCM credentials
// and iOS needs an APNs key, both configured once in EAS (see the app repo README).

export type Audience = "all" | "volunteers" | `user:${number}`;
export type PushData = { kind: "daily" | "update" | "prayer-reply" | "custom"; id?: number };

type Msg = { to: string; title: string; body: string; data?: PushData; sound: "default"; channelId?: string; priority: "high" };

async function tokensFor(audience: Audience): Promise<string[]> {
  await appReady();
  const sql = db();
  let rows;
  if (audience === "all") rows = await sql`select t.token from app_push_tokens t join app_users u on u.id = t.user_id where not u.blocked`;
  else if (audience === "volunteers") rows = await sql`select t.token from app_push_tokens t join app_users u on u.id = t.user_id where not u.blocked and u.role in ('volunteer','admin')`;
  else rows = await sql`select token from app_push_tokens where user_id = ${Number(audience.slice(5))}`;
  return rows.map((r) => r.token as string);
}

/** Sends to an audience and records it. Returns how many devices were reached. */
export async function notify(audience: Audience, title: string, body: string, data: PushData): Promise<number> {
  const tokens = await tokensFor(audience);
  const sent = await sendToTokens(tokens, title, body, data);
  await db()`insert into app_notifications (kind, ref_id, title, body, audience, sent_count) values (${data.kind}, ${data.id ?? null}, ${title}, ${body}, ${audience}, ${sent})`;
  return sent;
}

export async function sendToTokens(tokens: string[], title: string, body: string, data?: PushData): Promise<number> {
  if (!tokens.length) return 0;
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  let ok = 0;
  const dead: string[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const batch: Msg[] = tokens.slice(i, i + 100).map((to) => ({ to, title, body: body.slice(0, 180), data, sound: "default", channelId: data?.kind === "daily" ? "daily" : "default", priority: "high" }));
    try {
      const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers, body: JSON.stringify(batch), signal: AbortSignal.timeout(15000) });
      const json = (await r.json()) as { data?: { status: string; details?: { error?: string } }[] };
      json.data?.forEach((t, k) => {
        if (t.status === "ok") ok++;
        else if (t.details?.error === "DeviceNotRegistered") dead.push(batch[k].to);
      });
    } catch (e) {
      console.error("[push] batch failed:", (e as Error).message);
    }
  }
  if (dead.length) await db()`delete from app_push_tokens where token = any(${dead})`;
  return ok;
}
