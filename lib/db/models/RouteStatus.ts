import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { ROUTES } from "./Package";

// route_status: closures that block sales and show a banner
const routeStatusSchema = new Schema(
  {
    route: { type: String, enum: ROUTES, required: true },
    status: { type: String, enum: ["closed", "restricted"], required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    note: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
routeStatusSchema.index({ route: 1, active: 1 });
export type RouteStatusFields = InferSchemaType<typeof routeStatusSchema>;
export type RouteStatusDoc = RouteStatusFields & { _id: Types.ObjectId };
export const RouteStatus: Model<RouteStatusFields> = models.RouteStatus ?? model("RouteStatus", routeStatusSchema);
