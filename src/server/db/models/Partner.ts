import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { DEFAULT_COMMISSION_PCT, MAX_COMMISSION_PCT, MIN_COMMISSION_PCT } from "@/lib/money";

export const PARTNER_TYPES = ["homestay", "hotel", "operator"] as const;
export const VERIFICATION_STATUSES = ["pending", "verified", "suspended"] as const;

const partnerSchema = new Schema(
  {
    type: { type: String, enum: PARTNER_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true }, // E.164
    email: { type: String, trim: true },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: "pending" },
    /** Operator licence or homestay registration number. Shown on package pages for operators. */
    licenceNo: { type: String, trim: true },
    documents: [{ label: String, fileKey: String, uploadedAt: Date }],
    /** Razorpay Route linked account. Bank details live with Razorpay, never here. */
    razorpayLinkedAccountId: { type: String },
    commissionPct: {
      type: Number,
      default: DEFAULT_COMMISSION_PCT,
      min: MIN_COMMISSION_PCT,
      max: MAX_COMMISSION_PCT,
    },
    notes: { type: String },
  },
  { timestamps: true },
);
partnerSchema.index({ whatsapp: 1 });

export type PartnerFields = InferSchemaType<typeof partnerSchema>;
export type PartnerDoc = PartnerFields & { _id: Types.ObjectId };
export const Partner: Model<PartnerFields> = models.Partner ?? model("Partner", partnerSchema);
