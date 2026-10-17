/**
 * Private file storage for guest IDs and partner documents.
 * S3-compatible bucket when configured; otherwise a GridFS bucket in MongoDB
 * (fine for launch volumes). Files are reachable only through short-lived
 * signed URLs, and the file route also requires an admin session.
 */
import { createHmac, timingSafeEqual } from "crypto";
import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/server/env";
import { connectDB } from "@/server/db/connect";

export const SIGNED_URL_TTL_SECONDS = 300;
const BUCKET = "guest_files";

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

async function gridfs(): Promise<GridFSBucket> {
  await connectDB();
  // mongoose bundles its own mongodb driver; the bucket only needs the Db handle.
  return new GridFSBucket(mongoose.connection.db as unknown as ConstructorParameters<typeof GridFSBucket>[0], { bucketName: BUCKET });
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (s3Configured()) {
    await s3().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const bucket = await gridfs();
  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openUploadStream(key, { metadata: { contentType } });
    stream.once("finish", () => resolve());
    stream.once("error", reject);
    stream.end(body);
  });
}

export async function deleteObject(key: string): Promise<void> {
  if (s3Configured()) {
    await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return;
  }
  const bucket = await gridfs();
  const files = await bucket.find({ filename: key }).toArray();
  for (const f of files) await bucket.delete(f._id);
}

/** True if a stored file exists (used by tests and the purge audit). */
export async function objectExists(key: string): Promise<boolean> {
  if (s3Configured()) return true;
  const bucket = await gridfs();
  return (await bucket.find({ filename: key }).limit(1).toArray()).length > 0;
}

function sign(key: string, exp: number): string {
  return createHmac("sha256", env.sessionSecret).update(`${key}:${exp}`).digest("base64url");
}

export async function signedUrl(key: string, ttlSeconds = SIGNED_URL_TTL_SECONDS): Promise<string> {
  if (s3Configured()) {
    return getSignedUrl(s3(), new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }), { expiresIn: ttlSeconds });
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}?exp=${exp}&sig=${sign(key, exp)}`;
}

/** For the file route: returns the file only if the signature is valid and unexpired. */
export async function readSigned(key: string, exp: number, sig: string): Promise<{ body: Buffer; contentType: string } | null> {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const a = Buffer.from(sign(key, exp));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const bucket = await gridfs();
  const [file] = await bucket.find({ filename: key }).limit(1).toArray();
  if (!file) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of bucket.openDownloadStream(file._id)) chunks.push(chunk as Buffer);
  return { body: Buffer.concat(chunks), contentType: (file.metadata?.contentType as string) ?? "application/octet-stream" };
}
