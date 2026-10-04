import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { SiteContent } from "./types";
import { createSeed } from "./seed";
import { SEED_TRANSLATIONS } from "./seed-translations";

// File-backed content store.
//   data/published.json  – what visitors see
//   data/draft.json      – the editor's working copy (absent = no unpublished changes)
//   data/revisions/*.json – snapshot of every publish, for one-click restore

const DATA_DIR = process.env.CONTENT_DIR || path.join(process.cwd(), "data");
const PUBLISHED = path.join(DATA_DIR, "published.json");
const DRAFT = path.join(DATA_DIR, "draft.json");
const REVISIONS = path.join(DATA_DIR, "revisions");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const MAX_REVISIONS = 40;

// Content saved by an older version may lack newer fields; fill them in on read.
function normalize(c: SiteContent): SiteContent {
  if (!c.translations) c.translations = structuredClone(SEED_TRANSLATIONS);
  c.translations.te ??= {};
  c.translations.hi ??= {};
  return c;
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

let seeding: Promise<SiteContent> | null = null;

export async function getPublished(): Promise<SiteContent> {
  const existing = await readJson<SiteContent>(PUBLISHED);
  if (existing) return normalize(existing);
  // first run: concurrent requests share one seed write
  seeding ??= (async () => {
    const seed = createSeed();
    await writeJson(PUBLISHED, seed);
    return seed;
  })().finally(() => (seeding = null));
  return seeding;
}

export async function getDraft(): Promise<{ content: SiteContent; hasDraft: boolean }> {
  const draft = await readJson<SiteContent>(DRAFT);
  if (draft) return { content: normalize(draft), hasDraft: true };
  return { content: await getPublished(), hasDraft: false };
}

export async function saveDraft(content: SiteContent) {
  content.updatedAt = new Date().toISOString();
  await writeJson(DRAFT, content);
  return content.updatedAt;
}

export async function discardDraft() {
  await fs.rm(DRAFT, { force: true });
}

export async function publish(label?: string) {
  const { content } = await getDraft();
  content.updatedAt = new Date().toISOString();
  await writeJson(PUBLISHED, content);
  await fs.rm(DRAFT, { force: true });
  const id = `${Date.now()}`;
  await writeJson(path.join(REVISIONS, `${id}.json`), { id, label: label || "", publishedAt: content.updatedAt, content });
  await pruneRevisions();
  return content.updatedAt;
}

async function pruneRevisions() {
  const files = (await fs.readdir(REVISIONS).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
  for (const f of files.slice(0, Math.max(0, files.length - MAX_REVISIONS))) {
    await fs.rm(path.join(REVISIONS, f), { force: true });
  }
}

export async function listRevisions() {
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
  const r = await readJson<{ content: SiteContent }>(path.join(REVISIONS, `${id}.json`));
  if (!r) throw new Error("Revision not found");
  const content = normalize(r.content);
  await saveDraft(content);
  return content;
}
