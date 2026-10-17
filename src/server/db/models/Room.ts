import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

const roomSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1, max: 8 },
    /** Default nightly price in paise, used when opening inventory. */
    basePrice: { type: Number, required: true, min: 0 },
    icalImportUrls: [String], // Phase 2
    icalExportToken: { type: String }, // Phase 2
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
roomSchema.index({ propertyId: 1 });

export type RoomFields = InferSchemaType<typeof roomSchema>;
export type RoomDoc = RoomFields & { _id: Types.ObjectId };
export const Room: Model<RoomFields> = models.Room ?? model("Room", roomSchema);
