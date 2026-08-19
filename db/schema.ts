import {
  doublePrecision,
  index,
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

export type TripRow = typeof trips.$inferSelect;
export type ParticipantRow = typeof participants.$inferSelect;
export type EventRow = typeof events.$inferSelect;
