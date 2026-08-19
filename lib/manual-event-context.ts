import { ManualEventContextService } from "@/lib/manual-event-service";
import { createTripService } from "@/lib/trips";

export function createManualEventContextService() {
  return new ManualEventContextService(createTripService());
}
