import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const tripStatus = pgEnum("trip_status", ["active", "archived"]);
export const memberRole = pgEnum("member_role", ["owner", "member"]);
export const eventType = pgEnum("event_type", [
  "booking",
  "event",
  "transfer",
  "poll",
  "draft"
]);
export const eventStatus = pgEnum("event_status", [
  "draft",
  "active",
  "conflicted",
  "confirmed",
  "cancelled"
]);
export const eventSource = pgEnum("event_source", [
  "manual",
  "tutu",
  "demo_catalog",
  "external"
]);
export const pollStatus = pgEnum("poll_status", ["active", "closed"]);
export const voteValue = pgEnum("vote_value", ["yes", "maybe", "veto"]);
export const candidateBookingStatus = pgEnum("candidate_booking_status", [
  "idle",
  "available",
  "price_changed",
  "sold_out",
  "booking_failed",
  "confirmed"
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  ...timestamps
});

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    timezone: text("timezone").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),
    inviteCode: text("invite_code").notNull(),
    status: tripStatus("status").default("active").notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("trips_invite_code_idx").on(table.inviteCode),
    index("trips_owner_id_idx").on(table.ownerId)
  ]
);

export const tripMembers = pgTable(
  "trip_members",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    role: memberRole("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    primaryKey({ columns: [table.tripId, table.participantId] }),
    index("trip_members_participant_id_idx").on(table.participantId)
  ]
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    type: eventType("type").notNull(),
    status: eventStatus("status").notNull(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    locationName: text("location_name"),
    locationLat: doublePrecision("location_lat"),
    locationLon: doublePrecision("location_lon"),
    locationMapUrl: text("location_map_url"),
    source: eventSource("source").notNull(),
    externalRef: text("external_ref"),
    ...timestamps
  },
  (table) => [
    index("events_trip_time_idx").on(table.tripId, table.startsAt),
    uniqueIndex("events_source_external_ref_idx").on(table.source, table.externalRef)
  ]
);

export const eventParticipants = pgTable(
  "event_participants",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" })
  },
  (table) => [primaryKey({ columns: [table.eventId, table.participantId] })]
);

export const polls = pgTable(
  "polls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: pollStatus("status").default("active").notNull(),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    winnerCandidateId: uuid("winner_candidate_id"),
    finalistCandidateIds: jsonb("finalist_candidate_ids").$type<string[]>().default([]).notNull(),
    createdByParticipantId: uuid("created_by_participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),
    version: integer("version").default(1).notNull(),
    idempotencyKey: text("idempotency_key"),
    ...timestamps
  },
  (table) => [
    index("polls_trip_status_idx").on(table.tripId, table.status),
    uniqueIndex("polls_idempotency_key_idx").on(table.idempotencyKey)
  ]
);

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    travelOptionId: text("travel_option_id"),
    travelOption: jsonb("travel_option").$type<Record<string, unknown> | null>(),
    pricePerPerson: doublePrecision("price_per_person"),
    recheckedPricePerPerson: doublePrecision("rechecked_price_per_person"),
    availableSeats: integer("available_seats"),
    bookingUrl: text("booking_url"),
    bookingStatus: candidateBookingStatus("booking_status").default("idle").notNull(),
    bookingFailureReason: text("booking_failure_reason"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    bookingConfirmedAt: timestamp("booking_confirmed_at", { withTimezone: true }),
    bookingConfirmedByParticipantId: uuid("booking_confirmed_by_participant_id")
      .references(() => participants.id, { onDelete: "set null" }),
    source: text("source").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdByParticipantId: uuid("created_by_participant_id")
      .references(() => participants.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    index("candidates_poll_order_idx").on(table.pollId, table.sortOrder),
    uniqueIndex("candidates_poll_travel_option_idx").on(table.pollId, table.travelOptionId)
  ]
);

export const voteResponses = pgTable(
  "vote_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    value: voteValue("value").notNull(),
    idempotencyKey: text("idempotency_key"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("vote_responses_unique_vote_idx").on(table.pollId, table.candidateId, table.participantId),
    uniqueIndex("vote_responses_idempotency_key_idx").on(table.idempotencyKey),
    index("vote_responses_poll_updated_idx").on(table.pollId, table.updatedAt)
  ]
);

export type TripRow = typeof trips.$inferSelect;
export type ParticipantRow = typeof participants.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type PollRow = typeof polls.$inferSelect;
export type CandidateRow = typeof candidates.$inferSelect;
export type VoteResponseRow = typeof voteResponses.$inferSelect;
