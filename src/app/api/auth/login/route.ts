import { cookies } from "next/headers";
import { cookieOptions, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { checkLogin, getAccount } from "@/lib/accounts";

const attempts = new Map<string, { n: number; at: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const a = attempts.get(ip);
  if (a && a.n >= 8 && Date.now() - a.at < 10 * 60_000) {
    return Response.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const { username, password } = await req.json().catch(() => ({ username: "", password: "" }));
  if (!(await getAccount())) return Response.json({ error: "Admin login is not configured on the server (ADMIN_PASSWORD)." }, { status: 500 });
  const acc = await checkLogin(String(username || ""), String(password || ""));
  if (!acc) {
    attempts.set(ip, { n: (a?.n || 0) + 1, at: Date.now() });
    return Response.json({ error: "Incorrect login ID or password" }, { status: 401 });
  }
  attempts.delete(ip);
  const { token, maxAge } = await createSessionToken(acc.version);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(maxAge));
  return Response.json({ ok: true });
}
