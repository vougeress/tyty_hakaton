import { DrizzleTripRepository } from "@/lib/trips/drizzle-trip-repository";
import { TripService } from "@/lib/trips/trip-service";

export type * from "@/lib/trips/contracts";
export type { TripRepository } from "@/lib/trips/repository";
export { TripService } from "@/lib/trips/trip-service";

export function createTripService() {
  return new TripService(new DrizzleTripRepository());
}
