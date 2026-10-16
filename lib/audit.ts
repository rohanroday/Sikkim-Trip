import type { ClientSession } from "mongoose";
import { AuditLog } from "@/lib/db/models";

export async function audit(
  entry: { actor: string; action: string; entity: string; entityId: string; before?: unknown; after?: unknown },
  session?: ClientSession,
): Promise<void> {
  await AuditLog.create([{ ...entry, at: new Date() }], { session });
}
