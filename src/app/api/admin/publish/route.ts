import { publish } from "@/lib/store";
import { isAdmin, unauthorized } from "@/lib/admin-guard";

export async function POST(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const { label } = await req.json().catch(() => ({ label: "" }));
  const updatedAt = await publish(String(label || "").slice(0, 120));
  return Response.json({ ok: true, updatedAt, siteRefreshed: await refreshPublicSite() });
}

// Tell the public website (separate deployment) to drop its cached copy right away.
async function refreshPublicSite() {
  const site = process.env.SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!site || !secret) return false;
  try {
    const r = await fetch(`${site.replace(/\/$/, "")}/api/revalidate`, { method: "POST", headers: { "x-revalidate-secret": secret }, signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch {
    return false;
  }
}
