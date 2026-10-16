/**
 * Private file storage for guest IDs and partner documents.
 * S3-compatible bucket when configured; a local folder in development only.
 * Files are reachable only through short-lived signed URLs.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { ConfigError } from "@/lib/errors";

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");
export const SIGNED_URL_TTL_SECONDS = 300;

function s3Configured(): boolean {
  return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

let client: S3Client | null = null;
function s3(): S3Client {
  client ??= new S3Client({
    region: process.env.S3_REGION || "ap-south-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  return client;
}

function assertLocalAllowed() {
  if (env.isProd) throw new ConfigError("File storage is not configured (S3_* env vars).");
}

function localPath(key: string): string {
  const p = path.normalize(path.join(LOCAL_ROOT, key));
  if (!p.startsWith(LOCAL_ROOT)) throw new ConfigError("Bad file key.");
  return p;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (s3Configured()) {
    await s3().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  assertLocalAllowed();
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
}

export async function deleteObject(key: string): Promise<void> {
  if (s3Configured()) {
    await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return;
  }
  assertLocalAllowed();
  await fs.rm(localPath(key), { force: true });
}

function localSig(key: string, exp: number): string {
  return createHmac("sha256", env.sessionSecret).update(`${key}:${exp}`).digest("base64url");
}

export async function signedUrl(key: string, ttlSeconds = SIGNED_URL_TTL_SECONDS): Promise<string> {
  if (s3Configured()) {
    return getSignedUrl(s3(), new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }), { expiresIn: ttlSeconds });
  }
  assertLocalAllowed();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}?exp=${exp}&sig=${localSig(key, exp)}`;
}

/** For the dev-only local file route. */
export async function readLocalSigned(key: string, exp: number, sig: string): Promise<Buffer | null> {
  assertLocalAllowed();
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const a = Buffer.from(localSig(key, exp));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return fs.readFile(localPath(key)).catch(() => null);
}
