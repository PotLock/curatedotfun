DO $$
BEGIN
    -- Check if the `step_name` column does not exist and `plugin_name` does.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='processing_steps' AND column_name='step_name') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='processing_steps' AND column_name='plugin_name') THEN
        -- Rename `plugin_name` to `step_name`.
        ALTER TABLE "processing_steps" RENAME COLUMN "plugin_name" TO "step_name";
        -- Drop the old index on `plugin_name` if it exists.
        DROP INDEX IF EXISTS "processing_steps_plugin_name_idx";
        -- Create a new index on `step_name`.
        CREATE INDEX "processing_steps_step_name_idx" ON "processing_steps" USING btree ("step_name");
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    -- Add the `plugin_name` column if it does not exist.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='processing_steps' AND column_name='plugin_name') THEN
        ALTER TABLE "processing_steps" ADD COLUMN "plugin_name" text;
        -- Create an index on the new `plugin_name` column.
        CREATE INDEX "processing_steps_plugin_name_idx" ON "processing_steps" USING btree ("plugin_name");
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    -- Add the `config` column if it does not exist.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='processing_steps' AND column_name='config') THEN
        ALTER TABLE "processing_steps" ADD COLUMN "config" jsonb;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    -- If step_name exists and is NOT nullable, make it nullable.
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='processing_steps' AND column_name='step_name' AND is_nullable = 'NO') THEN
        ALTER TABLE "processing_steps" ALTER COLUMN "step_name" DROP NOT NULL;
    END IF;
END $$;
--> statement-breakpoint
-- Ensure the index on `retry_of_job_id` exists.
CREATE INDEX IF NOT EXISTS "processing_jobs_retry_check" ON "processing_jobs" USING btree ("id","retry_of_job_id") WHERE id != retry_of_job_id OR retry_of_job_id IS NULL;
