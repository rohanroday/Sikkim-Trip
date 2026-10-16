import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// webhook_events: idempotency
const webhookEventSchema = new Schema({
  provider: { type: String, required: true },
  eventId: { type: String, required: true },
  type: { type: String },
  processedAt: { type: Date, default: () => new Date() },
});
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
export const WebhookEvent: Model<InferSchemaType<typeof webhookEventSchema>> =
  models.WebhookEvent ?? model("WebhookEvent", webhookEventSchema);
