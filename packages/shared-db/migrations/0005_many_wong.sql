CREATE TYPE "public"."activity_type" AS ENUM('CONTENT_SUBMISSION', 'CONTENT_APPROVAL', 'TOKEN_BUY', 'TOKEN_SELL', 'POINTS_REDEMPTION', 'POINTS_AWARDED');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "submission_feeds" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."submission_status";--> statement-breakpoint
ALTER TABLE "submission_feeds" ALTER COLUMN "status" SET DATA TYPE "public"."submission_status" USING "status"::"public"."submission_status";--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "submitted_at" SET DATA TYPE timestamp USING "submitted_at"::timestamp without time zone;--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "type" SET DATA TYPE "public"."activity_type" USING "type"::"public"."activity_type";