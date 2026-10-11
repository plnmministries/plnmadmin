import { isAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";
import { SELFIE_DAYS, signedGet, storageConfigured } from "@/lib/storage";

// The selfie taken at check-in (admins only): redirects to a 10-minute signed R2 URL.
// R2 deletes selfies after 15 days (lifecycle rule), so older check-ins answer 404.
export async function GET(_req: Request, ctx: RouteContext<"/admin/app/attendance/[id]/selfie">) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  await appReady();
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return new Response("Not found", { status: 404 });
  const rows = await db()`select selfie_key, check_in_at from app_attendance where id = ${Number(id)}`;
  const a = rows[0];
  if (!a?.selfie_key || Date.now() - new Date(a.check_in_at as string).getTime() > SELFIE_DAYS * 86_400_000) return new Response("Not found", { status: 404 });
  if (!storageConfigured()) return new Response("Storage is not configured", { status: 503 });
  return new Response(null, { status: 302, headers: { Location: await signedGet(a.selfie_key as string), "Cache-Control": "private, no-store" } });
}
