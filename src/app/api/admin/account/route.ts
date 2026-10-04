import { cookies } from "next/headers";
import { isAdmin, unauthorized } from "@/lib/admin-guard";
import { getAccount, updateAccount } from "@/lib/accounts";
import { cookieOptions, createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  const acc = await getAccount();
  return Response.json({ username: acc?.username, usingDefault: acc?.version === "env" });
}

// Change login ID and/or password. Other devices are signed out; this one gets a fresh session.
export async function PUT(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const { currentPassword, username, password } = await req.json().catch(() => ({}));
  try {
    const acc = await updateAccount(String(currentPassword || ""), { username: username || undefined, password: password || undefined });
    const { token, maxAge } = await createSessionToken(acc.version);
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions(maxAge));
    return Response.json({ ok: true, username: acc.username });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
