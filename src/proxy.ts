import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

// This app is the ADMIN deployment. Visitors use the separate public website, so:
//   • /admin/*, /api/admin/*        → require a signed-in admin (route handlers check again)
//   • public pages + ?preview=draft → the editor's "Preview" button; admins only
//   • any other public page         → redirect to the editor (/admin)
export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const authed = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  const toLogin = () => {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname.startsWith("/admin") ? pathname : "/admin");
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/api/admin")) {
    return authed ? NextResponse.next() : Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname.startsWith("/admin")) return authed ? NextResponse.next() : toLogin();

  // a public page requested on the admin domain
  if (searchParams.get("preview") === "draft") return authed ? NextResponse.next() : toLogin();
  return NextResponse.redirect(new URL("/admin", req.url));
}

export const config = {
  // everything except framework assets, public APIs, uploaded media and static images
  matcher: ["/((?!_next/|api/public|api/auth|api/live|media/|brand/|images/|favicon\\.ico).*)"],
};
