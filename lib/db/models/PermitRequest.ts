import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

export const PERMIT_STATUSES = ["pending_docs", "ready", "sent", "filed", "approved", "rejected"] as const;
export type PermitStatus = (typeof PERMIT_STATUSES)[number];
export const ID_TYPES = ["aadhaar", "passport", "voter_id", "driving_licence", "pan"] as const;

const permitRequestSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    operatorId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    permitType: { type: String, enum: ["RAP", "PAP"], required: true },
    travelDate: { type: String, required: true },
    tripEndDate: { type: String, required: true },
    guestsExpected: { type: Number, required: true },
    guests: [
      {
        name: String,
        age: Number,
        gender: { type: String, enum: ["female", "male", "other"] },
        nationality: String,
        isForeign: Boolean,
        idType: { type: String, enum: ID_TYPES },
        /** Last 4 characters only. The full number lives only on the uploaded image. */
        idNumberMasked: String,
        idFileKey: String,
      },
    ],
    consentAt: { type: Date },
    status: { type: String, enum: PERMIT_STATUSES, default: "pending_docs" },
    statusNote: { type: String },
    /** ID files are purged after this instant (trip end + 7 days). */
    deleteDocsAfter: { type: Date, required: true },
    docsPurgedAt: { type: Date },
  },
  { timestamps: true },
);
permitRequestSchema.index({ deleteDocsAfter: 1, docsPurgedAt: 1 });
permitRequestSchema.index({ status: 1, travelDate: 1 });

export type PermitRequestFields = InferSchemaType<typeof permitRequestSchema>;
export type PermitRequestDoc = PermitRequestFields & { _id: Types.ObjectId };
export const PermitRequest: Model<PermitRequestFields> =
  models.PermitRequest ?? model("PermitRequest", permitRequestSchema);
