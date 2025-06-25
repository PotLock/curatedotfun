CREATE TYPE "public"."processing_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."processing_step_stage" AS ENUM('global', 'distributor', 'batch');--> statement-breakpoint
CREATE TYPE "public"."processing_step_status" AS ENUM('pending', 'processing', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."processing_step_type" AS ENUM('transformation', 'distribution');--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"feed_id" text NOT NULL,
	"idempotency_key" text,
	"status" "processing_job_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"retry_of_job_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "processing_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "processing_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"step_order" integer NOT NULL,
	"type" "processing_step_type" NOT NULL,
	"stage" "processing_step_stage" NOT NULL,
	"plugin_name" text NOT NULL,
	"status" "processing_step_status" DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_submission_id_submissions_tweet_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("tweet_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_retry_of_job_id_fkey" FOREIGN KEY ("retry_of_job_id") REFERENCES "public"."processing_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_steps" ADD CONSTRAINT "processing_steps_job_id_processing_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."processing_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "processing_jobs_submission_feed_idx" ON "processing_jobs" USING btree ("submission_id","feed_id");--> statement-breakpoint
CREATE INDEX "processing_jobs_status_idx" ON "processing_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "processing_jobs_started_at_idx" ON "processing_jobs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "processing_steps_job_idx" ON "processing_steps" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "processing_steps_plugin_name_idx" ON "processing_steps" USING btree ("plugin_name");--> statement-breakpoint
CREATE INDEX "processing_steps_status_idx" ON "processing_steps" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "processing_steps_job_order_idx" ON "processing_steps" USING btree ("job_id","step_order");