import mongoose from "mongoose";
import { env } from "@/server/env";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalForMongoose = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const uri = env.mongoUri;
    if (!uri) throw new Error("MONGODB_URI is not set. See .env.example.");
    cache.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 }).catch((err) => {
      cache.promise = null;
      throw err;
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

/**
 * Runs fn inside one MongoDB transaction. The driver retries fn on transient
 * write conflicts, so fn must have no side effects outside the database.
 */
export async function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  await connectDB();
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
