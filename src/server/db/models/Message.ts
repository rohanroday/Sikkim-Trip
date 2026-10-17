import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// messages: every WhatsApp/SMS send, with delivery status
const messageSchema = new Schema(
  {
    channel: { type: String, enum: ["whatsapp", "sms"], default: "whatsapp" },
    to: { type: String, required: true },
    template: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    providerMessageId: { type: String },
    status: { type: String, enum: ["queued", "sent", "delivered", "read", "failed", "skipped"], default: "queued" },
    error: { type: String },
  },
  { timestamps: true },
);
messageSchema.index({ providerMessageId: 1 });
messageSchema.index({ bookingId: 1 });
export type MessageFields = InferSchemaType<typeof messageSchema>;
export const Message: Model<MessageFields> = models.Message ?? model("Message", messageSchema);
