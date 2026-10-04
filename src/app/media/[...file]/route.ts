import path from "path";
import { readMedia } from "@/lib/store";

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".avif": "image/avif" };

// Serves images uploaded through the admin (database or ./data/uploads).
export async function GET(_req: Request, ctx: RouteContext<"/media/[...file]">) {
  const { file } = await ctx.params;
  const name = path.basename(file.join("/"));
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  const m = await readMedia(name, type);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(m.data), {
    headers: { "Content-Type": m.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" },
  });
}
