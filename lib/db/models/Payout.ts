import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// payouts: Phase 2 automates these via Razorpay Route; Phase 1 records manual ones
const payoutSchema = new Schema(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    gross: { type: Number, required: true },
    commission: { type: Number, required: true },
    fees: { type: Number, default: 0 },
    net: { type: Number, required: true },
    razorpayTransferId: { type: String },
    status: { type: String, enum: ["pending", "on_hold", "released", "settled", "reversed"], default: "pending" },
    utr: { type: String },
    releasedAt: { type: Date },
  },
  { timestamps: true },
);
payoutSchema.index({ partnerId: 1, createdAt: -1 });
export const Payout: Model<InferSchemaType<typeof payoutSchema>> = models.Payout ?? model("Payout", payoutSchema);
