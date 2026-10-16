import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

/** Seats on one package start date. seatsLeft is decremented atomically inside the hold transaction. */
const departureSchema = new Schema(
  {
    packageId: { type: Schema.Types.ObjectId, ref: "Package", required: true },
    date: { type: String, required: true }, // start date, IST
    capacity: { type: Number, required: true, min: 0 },
    seatsLeft: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true },
);
departureSchema.index({ packageId: 1, date: 1 }, { unique: true });

export type DepartureFields = InferSchemaType<typeof departureSchema>;
export type DepartureDoc = DepartureFields & { _id: Types.ObjectId };
export const Departure: Model<DepartureFields> = models.Departure ?? model("Departure", departureSchema);
