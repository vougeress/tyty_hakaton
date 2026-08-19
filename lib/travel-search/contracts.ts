import { z } from "zod";

export const travelOptionTypeSchema = z.enum(["train", "bus", "suburban_train", "hotel"]);
export const travelOptionSourceSchema = z.enum(["tutu", "demo_catalog", "user_link"]);

export const travelOptionSchema = z.object({
  id: z.string().min(1),
  type: travelOptionTypeSchema,
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureAt: z.iso.datetime(),
  arrivalAt: z.iso.datetime(),
  returnDepartureAt: z.iso.datetime().optional(),
  returnArrivalAt: z.iso.datetime().optional(),
  pricePerPerson: z.number().nonnegative(),
  availableSeats: z.number().int().nonnegative().optional(),
  bookingUrl: z.url().optional(),
  source: travelOptionSourceSchema,
  checkedAt: z.iso.datetime()
});

export const travelSearchModeSchema = z.enum(["auto", "mock", "live"]);

export const travelSearchInputSchema = z.object({
  tripId: z.string().min(1).optional(),
  gapId: z.string().min(1).optional(),
  origin: z.string().trim().min(1).max(160),
  destination: z.string().trim().min(1).max(160),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  travelers: z.coerce.number().int().min(1).max(12).default(1),
  types: z.array(travelOptionTypeSchema).default(["train", "bus", "suburban_train", "hotel"]),
  mode: travelSearchModeSchema.default("auto")
}).refine((value) => value.endsAt > value.startsAt, {
  message: "Search end must be after start",
  path: ["endsAt"]
});

export type TravelOptionType = z.infer<typeof travelOptionTypeSchema>;
export type TravelOptionSource = z.infer<typeof travelOptionSourceSchema>;
export type TravelOption = z.infer<typeof travelOptionSchema>;
export type TravelSearchMode = z.infer<typeof travelSearchModeSchema>;
export type TravelSearchInput = z.infer<typeof travelSearchInputSchema>;

export type TravelSearchResult = {
  options: TravelOption[];
  checkedAt: string;
  mode: Exclude<TravelSearchMode, "auto">;
  cache: "hit" | "miss";
  warnings: string[];
};
