// Copies every image in plnm_media (Postgres) to Cloudflare R2 under media/{name}, so the website
// and the admin can serve them from R2_PUBLIC_URL. Rows are KEPT: /media/… keeps working either way.
// Safe to re-run; objects already in R2 with the same size are skipped.
//
//   npm run migrate-media              reads DATABASE_URL and the R2_* variables from .env.local
//   npm run migrate-media -- --force   upload everything again, even if already there
//
// Standalone on purpose (no src/ imports): src/lib modules are marked server-only for Next.js.

import postgres from "postgres";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const force = process.argv.includes("--force");

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Put it in .env.local (see .env.example) and run: npm run migrate-media`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const databaseUrl = need("DATABASE_URL");
  const accountId = need("R2_ACCOUNT_ID");
  const bucket = need("R2_BUCKET");
  const publicUrl = need("R2_PUBLIC_URL").replace(/\/$/, "");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: need("R2_ACCESS_KEY_ID"), secretAccessKey: need("R2_SECRET_ACCESS_KEY") },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);
  const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: local ? false : "require", onnotice: () => {} });

  const existsWithSize = async (key: string, size: number) => {
    try {
      const h = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return h.ContentLength === size;
    } catch (e) {
      const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return false;
      throw e;
    }
  };

  let copied = 0;
  let skipped = 0;
  let bytes = 0;
  try {
    const names = await sql`select name, type, length(data)::int as size from plnm_media order by created_at`;
    console.log(`${names.length} image(s) in plnm_media → bucket "${bucket}" (${publicUrl}/media/…)\n`);
    for (const row of names) {
      const name = row.name as string;
      const key = `media/${name}`;
      const size = Number(row.size);
      if (!force && (await existsWithSize(key, size))) {
        console.log(`  = ${key}  already in R2 (${size} bytes), skipped`);
        skipped++;
        continue;
      }
      const [{ data }] = await sql`select data from plnm_media where name = ${name}`;
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data as Uint8Array, ContentType: row.type as string, CacheControl: "public, max-age=31536000, immutable" }));
      console.log(`  ↑ ${key}  copied (${size} bytes, ${row.type})  →  ${publicUrl}/${key}`);
      copied++;
      bytes += size;
    }
  } finally {
    await sql.end();
  }
  console.log(`\nDone: ${copied} copied (${(bytes / 1024 / 1024).toFixed(2)} MB), ${skipped} already there. plnm_media rows were not deleted.`);
}

main().catch((e) => {
  console.error("Migration failed:", (e as Error).message);
  process.exit(1);
});
