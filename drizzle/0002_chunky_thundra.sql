ALTER TABLE "vote_responses" ALTER COLUMN "value" SET DATA TYPE text;--> statement-breakpoint
UPDATE "vote_responses" SET "value" = 'veto' WHERE "value" = 'no';--> statement-breakpoint
DROP TYPE "public"."vote_value";--> statement-breakpoint
CREATE TYPE "public"."vote_value" AS ENUM('yes', 'maybe', 'veto');--> statement-breakpoint
ALTER TABLE "vote_responses" ALTER COLUMN "value" SET DATA TYPE "public"."vote_value" USING "value"::"public"."vote_value";
