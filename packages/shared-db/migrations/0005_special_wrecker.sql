CREATE TYPE "public"."activity_type" AS ENUM('CONTENT_SUBMISSION', 'CONTENT_APPROVAL', 'TOKEN_BUY', 'TOKEN_SELL', 'POINTS_REDEMPTION', 'POINTS_AWARDED');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "last_processed_state" (
	"feed_id" text NOT NULL,
	"source_plugin_name" text NOT NULL,
	"search_id" text NOT NULL,
	"state_json" jsonb NOT NULL,
	CONSTRAINT "last_processed_state_feed_id_source_plugin_name_search_id_pk" PRIMARY KEY("feed_id","source_plugin_name","search_id")
);
--> statement-breakpoint
ALTER TABLE "twitter_cache" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "twitter_cookies" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "twitter_cache" CASCADE;--> statement-breakpoint
DROP TABLE "twitter_cookies" CASCADE;--> statement-breakpoint
ALTER TABLE "submission_feeds" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."submission_status";--> statement-breakpoint
ALTER TABLE "submission_feeds" ALTER COLUMN "status" SET DATA TYPE "public"."submission_status" USING "status"::"public"."submission_status";--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "type" SET DATA TYPE "public"."activity_type" USING "type"::"public"."activity_type";