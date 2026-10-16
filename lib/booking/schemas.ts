import { z } from "zod";
import { isNightDate } from "@/lib/dates";

const nightDate = z.string().refine(isNightDate, "Use a valid date (YYYY-MM-DD).");

export const touristSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(80),
  email: z.string().trim().email("Please enter a valid email.").max(120).optional().or(z.literal("")),
});

export const createHoldSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("package"),
    packageSlug: z.string().min(1).max(120),
    date: nightDate,
    guests: z.number().int().min(1).max(20),
    tourist: touristSchema,
  }),
  z.object({
    kind: z.literal("stay"),
    propertySlug: z.string().min(1).max(120),
    roomId: z.string().regex(/^[a-f0-9]{24}$/i),
    checkIn: nightDate,
    checkOut: nightDate,
    guests: z.number().int().min(1).max(8),
    tourist: touristSchema,
  }),
]);
export type CreateHoldInput = z.infer<typeof createHoldSchema>;

export const guestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  age: z.number().int().min(0).max(110),
  gender: z.enum(["female", "male", "other"]),
  nationality: z.string().trim().min(2).max(40),
  idType: z.enum(["aadhaar", "passport", "voter_id", "driving_licence", "pan"]),
  idNumber: z.string().trim().min(4).max(30),
});
export type GuestInput = z.infer<typeof guestSchema>;
