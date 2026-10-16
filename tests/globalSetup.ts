import type { TestProject } from "vitest/node";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Transactions need a replica set, so tests never run against a standalone mongod.
export default async function setup(project: TestProject) {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  project.provide("mongoUri", replSet.getUri("sikkim_test"));
  return async () => {
    await replSet.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
