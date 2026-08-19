import type {
  CalendarEvent,
  CreateEventInput,
  CreateTripInput,
  JoinTripInput,
  TripDetails
} from "@/lib/trips/contracts";

export interface TripRepository {
  create(input: CreateTripInput & { inviteCode: string }): Promise<TripDetails>;
  findById(id: string): Promise<TripDetails | null>;
  findByInviteCode(inviteCode: string): Promise<TripDetails | null>;
  listArchived(limit?: number): Promise<TripDetails[]>;
  join(input: JoinTripInput): Promise<TripDetails>;
  listEvents(tripId: string): Promise<CalendarEvent[]>;
  findEventById(id: string): Promise<CalendarEvent | null>;
  createEvent(input: CreateEventInput): Promise<CalendarEvent>;
}
