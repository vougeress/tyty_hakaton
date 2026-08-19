export type TripStatus = "active" | "archived";
export type MemberRole = "owner" | "member";
export type CalendarEventType = "booking" | "event" | "transfer" | "poll" | "draft";
export type CalendarEventStatus = "draft" | "active" | "conflicted" | "confirmed" | "cancelled";
export type CalendarEventSource = "manual" | "tutu" | "demo_catalog" | "external";

export type Participant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: MemberRole;
};

export type Trip = {
  id: string;
  title: string;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  ownerId: string;
  inviteCode: string;
  status: TripStatus;
};

export type CalendarEvent = {
  id: string;
  tripId: string;
  type: CalendarEventType;
  status: CalendarEventStatus;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: {
    name: string;
    lat?: number;
    lon?: number;
    mapUrl?: string;
  } | null;
  participantIds: string[];
  source: CalendarEventSource;
  externalRef: string | null;
};

export type TripDetails = Trip & { participants: Participant[] };

export type CreateTripInput = {
  title: string;
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  owner: { displayName: string; avatarUrl?: string };
};

export type JoinTripInput = {
  inviteCode: string;
  participant: { displayName: string; avatarUrl?: string };
};

export type CreateEventInput = Omit<CalendarEvent, "id">;
