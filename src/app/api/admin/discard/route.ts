import { discardDraft, getPublished } from "@/lib/store";
import { isAdmin, unauthorized } from "@/lib/admin-guard";

export async function POST() {
  if (!(await isAdmin())) return unauthorized();
  await discardDraft();
  return Response.json({ content: await getPublished(), hasDraft: false });
}
