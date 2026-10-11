import { isAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { appReady } from "@/lib/app/schema";

// The selfie taken at check-in (admins only).
export async function GET(_req: Request, ctx: RouteContext<"/admin/app/attendance/[id]/selfie">) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  await appReady();
  const { id } = await ctx.params;
  const rows = await db()`select selfie from app_attendance where id = ${Number(id)}`;
  const data = rows[0]?.selfie as Buffer | null | undefined;
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
