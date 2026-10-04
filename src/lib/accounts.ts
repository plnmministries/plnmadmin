import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { hasDb, kvGet, kvSet } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;

// The admin login lives in data/admin.json, or the plnm_kv table when DATABASE_URL is set
// (password stored as a salted scrypt hash).
// Until it's changed in the editor, the login comes from ADMIN_USERNAME / ADMIN_PASSWORD.

const FILE = path.join(process.env.CONTENT_DIR || path.join(process.cwd(), "data"), "admin.json");

type Account = { username: string; salt: string; hash: string; version: string; updatedAt?: string };

async function hashPassword(password: string, salt: string) {
  return (await scrypt(password, salt, 64)).toString("hex");
}

let envAccount: Promise<Account> | null = null;

async function readStored(): Promise<Account | null> {
  if (hasDb()) return kvGet<Account>("admin_account");
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Account;
  } catch {
    return null;
  }
}

export async function getAccount(): Promise<Account | null> {
  const stored = await readStored();
  if (stored) return stored;
  // not changed yet: starter login from ADMIN_USERNAME / ADMIN_PASSWORD
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  envAccount ??= (async () => {
    const salt = "env";
    return { username: (process.env.ADMIN_USERNAME || "admin").toLowerCase(), salt, hash: await hashPassword(pw, salt), version: "env" };
  })();
  return envAccount;
}

export async function checkLogin(username: string, password: string) {
  const acc = await getAccount();
  if (!acc) return null;
  const given = Buffer.from(await hashPassword(password, acc.salt), "hex");
  const stored = Buffer.from(acc.hash, "hex");
  const userOk = username.trim().toLowerCase() === acc.username;
  const passOk = given.length === stored.length && timingSafeEqual(given, stored);
  return userOk && passOk ? acc : null;
}

export async function updateAccount(currentPassword: string, next: { username?: string; password?: string }) {
  const acc = await getAccount();
  if (!acc || !(await checkLogin(acc.username, currentPassword))) throw new Error("Current password is incorrect");
  const username = (next.username ?? acc.username).trim().toLowerCase();
  if (!/^[a-z0-9._@-]{3,40}$/.test(username)) throw new Error("Login ID: 3–40 letters, numbers, dots, dashes or @");
  if (next.password !== undefined && next.password.length < 8) throw new Error("New password must be at least 8 characters");
  const salt = next.password ? randomBytes(16).toString("hex") : acc.salt;
  const hash = next.password ? await hashPassword(next.password, salt) : acc.hash;
  const updated: Account = { username, salt, hash, version: randomBytes(8).toString("hex"), updatedAt: new Date().toISOString() };
  if (hasDb()) await kvSet("admin_account", updated);
  else {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(updated, null, 2), { mode: 0o600 });
  }
  return updated;
}
