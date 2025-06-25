DROP INDEX IF EXISTS "processing_steps_plugin_name_idx";--> statement-breakpoint
ALTER TABLE "processing_steps" ADD COLUMN "plugin_name" text;--> statement-breakpoint
ALTER TABLE "processing_steps" ADD COLUMN "config" jsonb;--> statement-breakpoint
CREATE INDEX "processing_jobs_retry_check" ON "processing_jobs" USING btree ("id","retry_of_job_id") WHERE id != retry_of_job_id OR retry_of_job_id IS NULL;--> statement-breakpoint
CREATE INDEX "processing_steps_plugin_name_idx" ON "processing_steps" USING btree ("plugin_name");