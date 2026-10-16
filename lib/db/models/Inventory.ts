import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

export const INVENTORY_STATUSES = ["available", "held", "booked", "blocked"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

/** One document per room per night. The (roomId, date) unique index is what makes double-booking impossible. */
const inventorySchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD, IST night
    price: { type: Number, required: true, min: 0 }, // paise
    status: { type: String, enum: INVENTORY_STATUSES, default: "available", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    holdExpiresAt: { type: Date },
    source: { type: String, enum: ["platform", "ical", "manual"], default: "manual" },
  },
  { timestamps: true },
);
inventorySchema.index({ roomId: 1, date: 1 }, { unique: true });
inventorySchema.index({ propertyId: 1, date: 1 });
inventorySchema.index({ bookingId: 1 });

export type InventoryFields = InferSchemaType<typeof inventorySchema>;
export type InventoryDoc = InventoryFields & { _id: Types.ObjectId };
export const Inventory: Model<InventoryFields> = models.Inventory ?? model("Inventory", inventorySchema);
