import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// audit_logs: append-only
const auditLogSchema = new Schema({
  actor: { type: String, required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  at: { type: Date, default: () => new Date() },
});
auditLogSchema.index({ entity: 1, entityId: 1, at: -1 });
export type AuditLogFields = InferSchemaType<typeof auditLogSchema>;
export const AuditLog: Model<AuditLogFields> = models.AuditLog ?? model("AuditLog", auditLogSchema);
