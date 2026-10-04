import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { SiteContent } from "./types";
import { createSeed } from "./seed";
import { SEED_TRANSLATIONS } from "./seed-translations";
import { db, hasDb, kvDel, kvGet, kvSet, mediaGet, ready } from "./db";
import { migrate } from "./migrate";

// Content store with two backends:
//   • Postgres (when DATABASE_URL is set; Neon in production): tables plnm_kv / plnm_revisions / plnm_media
//   • Local files (development):
//       data/published.json   – what visitors see
//       data/draft.json       – the editor's working copy (absent = no unpublished changes)
//       data/revisions/*.json – snapshot of every publish, for one-click restore
//       data/uploads/*        – images uploaded in the editor

const DATA_DIR = process.env.CONTENT_DIR || path.join(process.cwd(), "data");
const PUBLISHED = path.join(DATA_DIR, "published.json");
const DRAFT = path.join(DATA_DIR, "draft.json");
const REVISIONS = path.join(DATA_DIR, "revisions");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const MAX_REVISIONS = 40;

// Content saved by an older version may lack newer fields; fill them in on read.
function normalize(c: SiteContent): SiteContent {
  if (!c.translations) c.translations = structuredClone(SEED_TRANSLATIONS);
  c.translations.te ??= {};
  c.translations.hi ??= {};
  return migrate(c);
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file); // atomic replace so a crash never leaves half a file
}

// ---- tiny key/value layer over both backends ----
const get = <T>(key: "published" | "draft", file: string) => (hasDb() ? kvGet<T>(key) : readJson<T>(file));
const put = (key: "published" | "draft", file: string, value: unknown) => (hasDb() ? kvSet(key, value) : writeJson(file, value));
const del = (key: "published" | "draft", file: string) => (hasDb() ? kvDel(key) : fs.rm(file, { force: true }));

let seeding: Promise<SiteContent> | null = null;

export async function getPublished(): Promise<SiteContent> {
  const existing = await get<SiteContent>("published", PUBLISHED);
  if (existing) return normalize(existing);
  // first run: concurrent requests share one seed write
  seeding ??= (async () => {
    const seed = createSeed();
    await put("published", PUBLISHED, seed);
    return seed;
  })().finally(() => (seeding = null));
  return seeding;
}

export async function getDraft(): Promise<{ content: SiteContent; hasDraft: boolean }> {
  const draft = await get<SiteContent>("draft", DRAFT);
  if (draft) return { content: normalize(draft), hasDraft: true };
  return { content: await getPublished(), hasDraft: false };
}

export async function saveDraft(content: SiteContent) {
  content.updatedAt = new Date().toISOString();
  await put("draft", DRAFT, content);
  return content.updatedAt;
}

export async function discardDraft() {
  await del("draft", DRAFT);
}

export async function publish(label?: string) {
  const { content } = await getDraft();
  content.updatedAt = new Date().toISOString();
  await put("published", PUBLISHED, content);
  await del("draft", DRAFT);
  const id = Date.now();
  if (hasDb()) {
    await ready();
    const sql = db();
    await sql`insert into plnm_revisions (id, label, published_at, content) values (${id}, ${label || ""}, ${content.updatedAt}, ${sql.json(content as never)})`;
    await sql`delete from plnm_revisions where id not in (select id from plnm_revisions order by id desc limit ${MAX_REVISIONS})`;
  } else {
    await writeJson(path.join(REVISIONS, `${id}.json`), { id: String(id), label: label || "", publishedAt: content.updatedAt, content });
    const files = (await fs.readdir(REVISIONS).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
    for (const f of files.slice(0, Math.max(0, files.length - MAX_REVISIONS))) await fs.rm(path.join(REVISIONS, f), { force: true });
  }
  return content.updatedAt;
}

export async function listRevisions(): Promise<{ id: string; label: string; publishedAt: string }[]> {
  if (hasDb()) {
    await ready();
    const rows = await db()`select id, label, published_at from plnm_revisions order by id desc`;
    return rows.map((r) => ({ id: String(r.id), label: r.label as string, publishedAt: new Date(r.published_at as string).toISOString() }));
  }
  const files = (await fs.readdir(REVISIONS).catch(() => [])).filter((f) => f.endsWith(".json")).sort().reverse();
  const out: { id: string; label: string; publishedAt: string }[] = [];
  for (const f of files) {
    const r = await readJson<{ id: string; label: string; publishedAt: string }>(path.join(REVISIONS, f));
    if (r) out.push({ id: r.id, label: r.label, publishedAt: r.publishedAt });
  }
  return out;
}

export async function restoreRevision(id: string) {
  if (!/^\d+$/.test(id)) throw new Error("Bad revision id");
  let found: SiteContent | null = null;
  if (hasDb()) {
    await ready();
    const rows = await db()`select content from plnm_revisions where id = ${Number(id)}`;
    found = rows.length ? (rows[0].content as SiteContent) : null;
  } else {
    found = (await readJson<{ content: SiteContent }>(path.join(REVISIONS, `${id}.json`)))?.content ?? null;
  }
  if (!found) throw new Error("Revision not found");
  const content = normalize(found);
  await saveDraft(content);
  return content;
}

// ---- uploaded images ----

export async function saveMedia(name: string, type: string, data: Buffer) {
  if (hasDb()) {
    await ready();
    await db()`insert into plnm_media (name, type, data) values (${name}, ${type}, ${data}) on conflict (name) do update set type = excluded.type, data = excluded.data`;
    return;
  }
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, name), data);
}

export async function readMedia(name: string, type: string): Promise<{ type: string; data: Buffer } | null> {
  if (hasDb()) return mediaGet(name);
  try {
    return { type, data: await fs.readFile(path.join(UPLOADS_DIR, name)) };
  } catch {
    return null;
  }
}

export async function listMedia(): Promise<string[]> {
  if (hasDb()) {
    await ready();
    const rows = await db()`select name from plnm_media order by created_at desc`;
    return rows.map((r) => r.name as string);
  }
  return (await fs.readdir(UPLOADS_DIR).catch(() => [] as string[])).filter((f) => !f.startsWith(".")).sort().reverse();
}
