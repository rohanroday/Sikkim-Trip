import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

export const BOOKING_STATUSES = ["held", "paid", "confirmed", "completed", "expired", "cancelled", "refunded"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const itemSchema = new Schema(
  {
    type: { type: String, enum: ["package", "stay"], required: true },
    label: { type: String, required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    packageId: { type: Schema.Types.ObjectId, ref: "Package" },
    departureDate: { type: String },
    seats: { type: Number },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    nights: [String],
    amount: { type: Number, required: true, min: 0 }, // paise, what this partner's share is based on
    commission: { type: Number, required: true, min: 0 }, // paise
  },
  { _id: true },
);

const bookingSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    /** Secret for the magic status link. Never shown to partners. */
    accessToken: { type: String, required: true, select: false },
    kind: { type: String, enum: ["package", "stay"], required: true },
    tourist: {
      type: new Schema(
        {
          name: { type: String, required: true },
          phone: { type: String, required: true },
          email: { type: String },
        },
        { _id: false },
      ),
      required: true,
    },
    packageId: { type: Schema.Types.ObjectId, ref: "Package" },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true }, // last day of trip / checkout day
    guests: { type: Number, required: true, min: 1 },
    items: [itemSchema],
    amount: { type: Number, required: true, min: 0 }, // paise charged to tourist
    commission: { type: Number, required: true, min: 0 },
    status: { type: String, enum: BOOKING_STATUSES, required: true, default: "held" },
    statusHistory: [
      {
        from: String,
        to: String,
        at: Date,
        actor: String,
        note: String,
      },
    ],
    holdExpiresAt: { type: Date },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paidAt: { type: Date },
    permitRequired: { type: Boolean, default: false },
    partnerConfirmations: [
      {
        partnerId: { type: Schema.Types.ObjectId, ref: "Partner" },
        status: { type: String, enum: ["pending", "confirmed", "declined"], default: "pending" },
        notifiedAt: Date,
        respondedAt: Date,
        escalatedAt: Date,
      },
    ],
    cancellation: {
      requestedAt: Date,
      by: String,
      reason: String,
      refundPct: Number,
    },
    refund: {
      amount: Number,
      razorpayRefundId: String,
      status: { type: String, enum: ["pending", "processed", "failed", "simulated"] },
      reason: String,
    },
    /** Set when the amount on a payment did not match; needs a human. */
    flagged: { type: String },
  },
  { timestamps: true },
);
bookingSchema.index({ status: 1, holdExpiresAt: 1 });
bookingSchema.index({ razorpayOrderId: 1 });
bookingSchema.index({ "tourist.phone": 1 });
bookingSchema.index({ startDate: 1 });

export type BookingFields = InferSchemaType<typeof bookingSchema>;
export type BookingDoc = BookingFields & { _id: Types.ObjectId };
export const Booking: Model<BookingFields> = models.Booking ?? model("Booking", bookingSchema);
