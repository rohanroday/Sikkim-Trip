import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

export const PROPERTY_TYPES = ["homestay", "hotel"] as const;
export const TOWNS = ["Gangtok", "Pelling", "Lachung", "Lachen", "Zuluk", "Ravangla", "Namchi", "Yuksom"] as const;
/** Homestays must have fewer than 5 rooms under state rules. */
export const MAX_HOMESTAY_ROOMS = 4;

const propertySchema = new Schema(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: PROPERTY_TYPES, required: true },
    town: { type: String, required: true },
    district: { type: String },
    geo: { lat: Number, lng: Number },
    summary: { type: String, default: "" },
    description: { type: String, default: "" },
    photos: [{ url: String, alt: String }],
    amenities: [String],
    distances: [{ sight: String, km: Number }],
    houseRules: [String],
    registrationNo: { type: String },
    status: { type: String, enum: ["draft", "live", "paused"], default: "draft" },
  },
  { timestamps: true },
);
propertySchema.index({ town: 1, status: 1 });

export type PropertyFields = InferSchemaType<typeof propertySchema>;
export type PropertyDoc = PropertyFields & { _id: Types.ObjectId };
export const Property: Model<PropertyFields> = models.Property ?? model("Property", propertySchema);
