/**
 * Local MongoDB replica set for development (transactions need a replica set).
 * Data persists in .data/db. Use this until you have a MongoDB Atlas URI.
 *
 *   npm run dev:db      then set MONGODB_URI=mongodb://127.0.0.1:27017/sikkim?replicaSet=rs0
 */
import { mkdirSync } from "fs";
import path from "path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

async function main() {
  const dbPath = path.join(process.cwd(), ".data", "db");
  mkdirSync(dbPath, { recursive: true });
  const rs = await MongoMemoryReplSet.create({
    replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ port: 27017, dbPath }],
  });
  console.log(`MongoDB replica set running.\nMONGODB_URI=mongodb://127.0.0.1:27017/sikkim?replicaSet=rs0\n(${rs.getUri()})\nCtrl+C to stop.`);
  const stop = async () => {
    await rs.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
