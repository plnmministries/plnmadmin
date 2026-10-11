import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 (S3-compatible) holds every uploaded file; the free Neon database is only 0.5 GB.
// Phones upload straight to R2 with a presigned PUT (Vercel caps request bodies at 4.5 MB), so this
// module mostly signs URLs; only the admin's website images pass through a server (putObject).
//
// Key layout:
//   avatars/{userId}/{version}.jpg     public  – profile pictures, served from R2_PUBLIC_URL        (R2_BUCKET)
//   media/{name}                       public  – website + update images uploaded in the admin      (R2_BUCKET)
//   attendance/{YYYY-MM-DD}/{id}.jpg   private – check-in selfies, read through 10-minute signed URLs;
//                                                a bucket lifecycle rule deletes attendance/ after 15 days
//                                                (R2_PRIVATE_BUCKET; a custom domain makes a whole bucket
//                                                public, so selfies must not share the public one)
//
// Setup (buckets, API token, custom domain, lifecycle rule): README → "Cloudflare R2".

export const UPLOAD_URL_SECONDS = 5 * 60;
export const VIEW_URL_SECONDS = 10 * 60;
/** How long selfies are kept. The lifecycle rule in the bucket and the API agree on this. */
export const SELFIE_DAYS = 15;
/** A selfie may only be attached this soon after checking in. */
export const SELFIE_WINDOW_MINUTES = 15;
// the phone resizes photos before uploading, so real files are far smaller than these caps
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const SELFIE_MAX_BYTES = 3 * 1024 * 1024;

const settings = () => ({
  accountId: process.env.R2_ACCOUNT_ID || "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  bucket: process.env.R2_BUCKET || "",
  privateBucket: process.env.R2_PRIVATE_BUCKET || "",
  publicUrl: (process.env.R2_PUBLIC_URL || "").replace(/\/$/, ""),
});

/** True when every required R2_* variable is set. Callers fall back (database, 503) when it isn't. */
export function storageConfigured() {
  const s = settings();
  return !!(s.accountId && s.accessKeyId && s.secretAccessKey && s.bucket && s.publicUrl);
}

const g = globalThis as { __plnmR2?: S3Client; __plnmR2Warned?: boolean };

function client(): S3Client {
  if (!storageConfigured()) throw new Error("R2 storage is not configured (set the R2_* variables)");
  if (!g.__plnmR2) {
    const s = settings();
    g.__plnmR2 = new S3Client({
      region: "auto",
      endpoint: `https://${s.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey },
      // R2 doesn't implement the SDK's newer default CRC checksums
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return g.__plnmR2;
}

/** The bucket a key lives in: selfies in the private bucket, everything else in the public one. */
function bucketFor(key: string) {
  const s = settings();
  if (!key.startsWith("attendance/")) return s.bucket;
  if (s.privateBucket) return s.privateBucket;
  if (!g.__plnmR2Warned) {
    g.__plnmR2Warned = true;
    console.warn("[storage] R2_PRIVATE_BUCKET is not set: selfies go to the public bucket and are reachable through its custom domain");
  }
  return s.bucket;
}

// ---- key layout ----

export const avatarKey = (userId: number | string, version: string) => `avatars/${userId}/${version}.jpg`;
export const isOwnAvatarKey = (key: string, userId: number | string) => new RegExp(`^avatars/${userId}/[a-z0-9]{1,20}\\.jpg$`).test(key);
export const attendanceKey = (checkInAt: Date, attendanceId: number | string) => `attendance/${dayInIndia(checkInAt)}/${attendanceId}.jpg`;
export const mediaKey = (name: string) => `media/${name}`;

/** YYYY-MM-DD of a moment in India (the church's day), used to group selfies in the bucket. */
const dayInIndia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Public address of a key under avatars/ or media/. */
export function publicUrl(key: string) {
  return `${settings().publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** app_users.photo holds an R2 key; the app gets a URL. Values that are already URLs pass through. */
export function avatarUrl(photo: string | null | undefined): string | null {
  if (!photo) return null;
  if (/^(https?:|data:)/.test(photo)) return photo;
  return storageConfigured() ? publicUrl(photo) : null;
}

// ---- signed URLs ----

export type PresignedUpload = {
  /** PUT the raw bytes here with exactly these headers, before expiresAt. */
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
  key: string;
  maxBytes: number;
};

/**
 * A PUT URL valid for 5 minutes. The Content-Type is part of the signature, and so is the
 * Content-Length when `size` is given: R2 then refuses anything but exactly that many bytes,
 * which is the only way an S3 presigned PUT can enforce a size limit. Sizes above maxBytes are refused here.
 */
export async function presignUpload(key: string, contentType: string, maxBytes: number, size?: number): Promise<PresignedUpload> {
  if (size !== undefined && (!Number.isInteger(size) || size <= 0)) throw new RangeError("size must be a whole number of bytes");
  if (size !== undefined && size > maxBytes) throw new RangeError(`File is larger than ${Math.round(maxBytes / 1024)} KB`);
  const command = new PutObjectCommand({ Bucket: bucketFor(key), Key: key, ContentType: contentType, ContentLength: size });
  const url = await getSignedUrl(client(), command, { expiresIn: UPLOAD_URL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) });
  const headers: Record<string, string> = { "Content-Type": contentType };
  if (size !== undefined) headers["Content-Length"] = String(size);
  return { url, method: "PUT", headers, expiresAt: new Date(Date.now() + UPLOAD_URL_SECONDS * 1000).toISOString(), key, maxBytes };
}

/** A GET URL for a private object, valid for 10 minutes. */
export function signedGet(key: string) {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucketFor(key), Key: key }), { expiresIn: VIEW_URL_SECONDS });
}

// ---- objects ----

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: bucketFor(key), Key: key }));
}

/** Size in bytes when the object exists, otherwise null. */
export async function objectSize(key: string): Promise<number | null> {
  try {
    const r = await client().send(new HeadObjectCommand({ Bucket: bucketFor(key), Key: key }));
    return r.ContentLength ?? 0;
  } catch (e) {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

/** Uploads from a server (admin website images, the migration script). Names are unique per upload, so cache forever. */
export async function putObject(key: string, contentType: string, data: Uint8Array) {
  await client().send(new PutObjectCommand({ Bucket: bucketFor(key), Key: key, Body: data, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
}

/** Every key under a prefix, newest first. */
export async function listKeys(prefix: string): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const out: { key: string; size: number; lastModified: Date }[] = [];
  let token: string | undefined;
  do {
    const r = await client().send(new ListObjectsV2Command({ Bucket: bucketFor(prefix), Prefix: prefix, ContinuationToken: token }));
    for (const o of r.Contents ?? []) if (o.Key) out.push({ key: o.Key, size: o.Size ?? 0, lastModified: o.LastModified ?? new Date(0) });
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}
