import { promises as fs } from "fs";
import path from "path";
import { UPLOADS_DIR } from "@/lib/store";

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif" };

// Serves files uploaded through the admin (stored outside /public so they work after build).
export async function GET(_req: Request, ctx: RouteContext<"/media/[...file]">) {
  const { file } = await ctx.params;
  const name = path.basename(file.join("/"));
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(UPLOADS_DIR, name));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
