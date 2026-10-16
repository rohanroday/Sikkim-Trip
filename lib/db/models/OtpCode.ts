import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// otp_codes: hashed one-time codes
const otpCodeSchema = new Schema({
  phone: { type: String, required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  usedAt: { type: Date },
  createdAt: { type: Date, default: () => new Date() },
});
otpCodeSchema.index({ phone: 1, createdAt: -1 });
// Expired codes are safe to delete outright.
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
export const OtpCode: Model<InferSchemaType<typeof otpCodeSchema>> = models.OtpCode ?? model("OtpCode", otpCodeSchema);
