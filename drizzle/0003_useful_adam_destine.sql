CREATE TYPE "public"."candidate_booking_status" AS ENUM('idle', 'available', 'price_changed', 'sold_out', 'booking_failed', 'confirmed');--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "rechecked_price_per_person" double precision;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "available_seats" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "booking_url" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "booking_status" "candidate_booking_status" DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "booking_failure_reason" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "booking_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "booking_confirmed_by_participant_id" uuid;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_booking_confirmed_by_participant_id_participants_id_fk" FOREIGN KEY ("booking_confirmed_by_participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;