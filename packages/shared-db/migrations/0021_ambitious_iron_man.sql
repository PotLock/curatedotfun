ALTER TABLE "processing_jobs" ADD COLUMN "plan" jsonb;--> statement-breakpoint
ALTER TABLE "feeds" ADD CONSTRAINT "id_lowercase_check" CHECK (id = lower(id));