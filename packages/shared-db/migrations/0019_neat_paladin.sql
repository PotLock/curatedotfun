ALTER TABLE "processing_steps" RENAME COLUMN "plugin_name" TO "step_name";--> statement-breakpoint
DROP INDEX "processing_steps_plugin_name_idx";--> statement-breakpoint
CREATE INDEX "processing_steps_plugin_name_idx" ON "processing_steps" USING btree ("step_name");