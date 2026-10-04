// Signed-cookie session for the admin. Uses Web Crypto so it works both in
// route handlers and in proxy.ts. The token carries the account "version";
// changing the username/password bumps it, which signs out every other device.

export const SESSION_COOKIE = "plnm_admin";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-only-secret-change-me";
}

async function hmac(data: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(sig).toString("base64url");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(version: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const body = `${exp}.${version}`;
  return { token: `${body}.${await hmac(body)}`, maxAge: MAX_AGE };
}

/** Checks signature + expiry. Returns the account version inside the token, or null. */
export async function readSessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [exp, version, sig] = parts;
  if (!exp || !version || !sig || Number(exp) < Date.now() / 1000) return null;
  return safeEqual(await hmac(`${exp}.${version}`), sig) ? version : null;
}

export async function verifySessionToken(token: string | undefined | null) {
  return (await readSessionToken(token)) !== null;
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});
