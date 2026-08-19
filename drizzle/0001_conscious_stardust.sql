CREATE TYPE "public"."poll_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."vote_value" AS ENUM('yes', 'no', 'maybe');--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"travel_option_id" text,
	"travel_option" jsonb,
	"price_per_person" double precision,
	"source" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by_participant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "poll_status" DEFAULT 'active' NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"winner_candidate_id" uuid,
	"finalist_candidate_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_participant_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"value" "vote_value" NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_created_by_participant_id_participants_id_fk" FOREIGN KEY ("created_by_participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_participant_id_participants_id_fk" FOREIGN KEY ("created_by_participant_id") REFERENCES "public"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_responses" ADD CONSTRAINT "vote_responses_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_responses" ADD CONSTRAINT "vote_responses_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_responses" ADD CONSTRAINT "vote_responses_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidates_poll_order_idx" ON "candidates" USING btree ("poll_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "candidates_poll_travel_option_idx" ON "candidates" USING btree ("poll_id","travel_option_id");--> statement-breakpoint
CREATE INDEX "polls_trip_status_idx" ON "polls" USING btree ("trip_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "polls_idempotency_key_idx" ON "polls" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "vote_responses_unique_vote_idx" ON "vote_responses" USING btree ("poll_id","candidate_id","participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vote_responses_idempotency_key_idx" ON "vote_responses" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "vote_responses_poll_updated_idx" ON "vote_responses" USING btree ("poll_id","updated_at");