CREATE TABLE "feed_recaps_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"feed_id" text NOT NULL,
	"recap_id" text NOT NULL,
	"external_job_id" text,
	"last_successful_completion" timestamp,
	"last_run_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "feed_recaps_state_external_job_id_unique" UNIQUE("external_job_id")
);
--> statement-breakpoint
-- First add the column without NOT NULL constraint
ALTER TABLE "feeds" ADD COLUMN "config" jsonb;
--> statement-breakpoint
-- Initialize the config column with data from existing columns
UPDATE "feeds" SET "config" = jsonb_build_object(
  'id', "id",
  'name', "name",
  'description', "description"
);
--> statement-breakpoint
-- Now add the NOT NULL constraint
ALTER TABLE "feeds" ALTER COLUMN "config" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "feed_recaps_state" ADD CONSTRAINT "feed_recaps_state_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_recap_id_idx" ON "feed_recaps_state" USING btree ("feed_id","recap_id");
