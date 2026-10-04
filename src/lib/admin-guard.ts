import "server-only";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE } from "./auth";
import { getAccount } from "./accounts";

/** Valid signed session AND issued for the current login (not one changed since). */
export async function isAdmin() {
  const version = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!version) return false;
  const acc = await getAccount();
  return !!acc && acc.version === version;
}

export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
