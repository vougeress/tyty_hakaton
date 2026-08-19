CREATE TYPE "public"."event_source" AS ENUM('manual', 'tutu', 'demo_catalog', 'external');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'active', 'conflicted', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('booking', 'event', 'transfer', 'poll', 'draft');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "event_participants" (
	"event_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	CONSTRAINT "event_participants_event_id_participant_id_pk" PRIMARY KEY("event_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"type" "event_type" NOT NULL,
	"status" "event_status" NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location_name" text,
	"location_lat" double precision,
	"location_lon" double precision,
	"location_map_url" text,
	"source" "event_source" NOT NULL,
	"external_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_members" (
	"trip_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_members_trip_id_participant_id_pk" PRIMARY KEY("trip_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"timezone" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"owner_id" uuid NOT NULL,
	"invite_code" text NOT NULL,
	"status" "trip_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_owner_id_participants_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_trip_time_idx" ON "events" USING btree ("trip_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "events_source_external_ref_idx" ON "events" USING btree ("source","external_ref");--> statement-breakpoint
CREATE INDEX "trip_members_participant_id_idx" ON "trip_members" USING btree ("participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_invite_code_idx" ON "trips" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "trips_owner_id_idx" ON "trips" USING btree ("owner_id");