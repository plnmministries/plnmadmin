import "server-only";
import postgres from "postgres";

// Optional Postgres storage (Neon in production). When DATABASE_URL is set, content, revisions,
// uploaded images and the admin login live in the database instead of the local ./data folder,
// which is what lets the admin run on hosts without a persistent disk (e.g. Render free).

export const hasDb = () => !!process.env.DATABASE_URL;

type Sql = postgres.Sql<Record<string, unknown>>;
const g = globalThis as { __plnmSql?: Sql; __plnmSchema?: Promise<void> };

export function db(): Sql {
  if (!g.__plnmSql) {
    const url = process.env.DATABASE_URL!;
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    g.__plnmSql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false, // required for Neon's pooled (PgBouncer) connection string
      ssl: local ? false : "require",
      onnotice: () => {},
    });
  }
  return g.__plnmSql;
}

/** Creates the tables on first use (idempotent). */
export function ready(): Promise<void> {
  g.__plnmSchema ??= (async () => {
    const sql = db();
    await sql`create table if not exists plnm_kv (key text primary key, value jsonb not null, updated_at timestamptz not null default now())`;
    await sql`create table if not exists plnm_revisions (id bigint primary key, label text not null default '', published_at timestamptz not null, content jsonb not null)`;
    await sql`create table if not exists plnm_media (name text primary key, type text not null, data bytea not null, created_at timestamptz not null default now())`;
  })().catch((e) => {
    g.__plnmSchema = undefined; // retry next time
    throw e;
  });
  return g.__plnmSchema;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  await ready();
  const rows = await db()`select value from plnm_kv where key = ${key}`;
  return rows.length ? (rows[0].value as T) : null;
}

export async function kvSet(key: string, value: unknown) {
  await ready();
  const json = db().json(value as postgres.JSONValue);
  await db()`insert into plnm_kv (key, value, updated_at) values (${key}, ${json}, now())
             on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

export async function kvDel(key: string) {
  await ready();
  await db()`delete from plnm_kv where key = ${key}`;
}

export async function mediaGet(name: string): Promise<{ type: string; data: Buffer } | null> {
  await ready();
  const rows = await db()`select type, data from plnm_media where name = ${name}`;
  return rows.length ? { type: rows[0].type as string, data: rows[0].data as Buffer } : null;
}
