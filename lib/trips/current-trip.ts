import { cookies } from "next/headers";

import { DEMO_TRIP_ID, TRIP_STORAGE_KEY } from "@/lib/trips/constants";

export async function getCurrentTripId() {
  const value = (await cookies()).get(TRIP_STORAGE_KEY)?.value;
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : DEMO_TRIP_ID;
}
