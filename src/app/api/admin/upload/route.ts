import path from "path";
import { saveMedia } from "@/lib/store";
import { isAdmin, unauthorized } from "@/lib/admin-guard";

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml" };
// the editor shrinks photos before upload, so real uploads are well under this
const MAX = 8 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  const ext = path.extname(file.name).toLowerCase();
  const type = TYPES[ext];
  if (!type) return Response.json({ error: "Only images can be uploaded" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "Image is larger than 8 MB" }, { status: 400 });
  const base = path.basename(file.name, ext).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const name = `${Date.now().toString(36)}-${base}${ext}`;
  await saveMedia(name, type, Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/media/${name}` });
}
