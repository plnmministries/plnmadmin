import { listRevisions, restoreRevision } from "@/lib/store";
import { isAdmin, unauthorized } from "@/lib/admin-guard";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  return Response.json({ revisions: await listRevisions() });
}

// Restores a published snapshot into the draft (still needs Publish to go live).
export async function POST(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await req.json();
  try {
    return Response.json({ content: await restoreRevision(String(id)) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 404 });
  }
}
