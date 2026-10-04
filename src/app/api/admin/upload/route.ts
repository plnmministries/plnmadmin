import { promises as fs } from "fs";
import path from "path";
import { UPLOADS_DIR } from "@/lib/store";
import { isAdmin, unauthorized } from "@/lib/admin-guard";

const OK = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"]);
const MAX = 12 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  const ext = path.extname(file.name).toLowerCase();
  if (!OK.has(ext)) return Response.json({ error: "Only images can be uploaded" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "Image is larger than 12 MB" }, { status: 400 });
  const base = path.basename(file.name, ext).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const name = `${Date.now().toString(36)}-${base}${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/media/${name}` });
}
