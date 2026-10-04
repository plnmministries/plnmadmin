import { getDraft, saveDraft } from "@/lib/store";
import { isAdmin, unauthorized } from "@/lib/admin-guard";
import type { SiteContent } from "@/lib/types";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  return Response.json(await getDraft());
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const content = (await req.json()) as SiteContent;
  if (!content?.pages || !content?.settings || !content?.theme) return Response.json({ error: "Invalid content" }, { status: 400 });
  const updatedAt = await saveDraft(content);
  return Response.json({ ok: true, updatedAt });
}
