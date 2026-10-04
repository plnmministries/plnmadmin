import { promises as fs } from "fs";
import path from "path";
import { listMedia } from "@/lib/store";
import { isAdmin, unauthorized } from "@/lib/admin-guard";

// Media library: uploaded images first, then the built-in photos that ship with the site.
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const uploads = (await listMedia()).map((f) => `/media/${f}`);
  const pub = path.join(process.cwd(), "public");
  const builtIn: string[] = [];
  for (const dir of ["brand", "images/ig", "images/yt"]) {
    for (const f of await fs.readdir(path.join(pub, dir)).catch(() => [] as string[])) {
      if (/\.(png|jpe?g|webp)$/i.test(f) && f !== "logo.png") builtIn.push(`/${dir}/${f}`);
    }
  }
  return Response.json({ uploads, builtIn });
}
