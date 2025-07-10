ALTER TYPE "public"."processing_job_status" ADD VALUE 'completed_with_errors';
DROP INDEX "public"."processing_jobs_retry_check";
ALTER TABLE "public"."processing_jobs" ADD CONSTRAINT "processing_jobs_retry_check" CHECK (id != retry_of_job_id OR retry_of_job_id IS NULL);
