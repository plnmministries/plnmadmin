import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

// Gate the editor and its APIs. Route handlers check again (defence in depth).
export async function proxy(req: NextRequest) {
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL("/admin/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)", "/api/admin/:path*"],
};
