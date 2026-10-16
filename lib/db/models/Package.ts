import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

export const PRICE_UNITS = ["person", "vehicle"] as const;
export const PERMIT_TYPES = ["none", "RAP", "PAP"] as const;
export const ROUTES = ["north-sikkim", "lachen", "lachung", "nathula", "tsomgo", "zuluk", "pelling", "gangtok"] as const;
export type RouteName = (typeof ROUTES)[number];

const packageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    region: { type: String, required: true },
    summary: { type: String, default: "" },
    durationDays: { type: Number, required: true, min: 1 },
    itinerary: [{ day: Number, title: String, detail: String }],
    inclusions: [String],
    exclusions: [String],
    /** Registered operator who runs the trip and files permits. Seller of record for permit trips. */
    operatorId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    /** Night index (0-based) to the property used that night. */
    stays: [{ night: Number, propertyId: { type: Schema.Types.ObjectId, ref: "Property" } }],
    vehicleType: { type: String, default: "" },
    /** Price in paise per priceUnit. */
    price: { type: Number, required: true, min: 0 },
    priceUnit: { type: String, enum: PRICE_UNITS, default: "person" },
    /** Government-notified fare in the same unit as price, if any. Price may never go below it. */
    priceFloorRef: { type: Number, min: 0 },
    minGuests: { type: Number, default: 1 },
    maxGuests: { type: Number, default: 8 },
    permitType: { type: String, enum: PERMIT_TYPES, default: "none" },
    routes: [{ type: String, enum: ROUTES }],
    heroImage: { url: String, alt: String },
    status: { type: String, enum: ["draft", "live", "paused"], default: "draft" },
  },
  { timestamps: true },
);

export type PackageFields = InferSchemaType<typeof packageSchema>;
export type PackageDoc = PackageFields & { _id: Types.ObjectId };
export const Package: Model<PackageFields> = models.Package ?? model("Package", packageSchema);
