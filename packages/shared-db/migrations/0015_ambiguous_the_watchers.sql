ALTER TABLE "moderation_history" RENAME COLUMN "tweet_id" TO "submission_id";--> statement-breakpoint
ALTER TABLE "moderation_history" RENAME COLUMN "admin_id" TO "moderator_account_id";--> statement-breakpoint
ALTER TABLE "moderation_history" DROP CONSTRAINT IF EXISTS "moderation_history_tweet_id_submissions_tweet_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "moderation_history_tweet_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "moderation_history_admin_idx";--> statement-breakpoint
ALTER TABLE "moderation_history" ADD COLUMN "moderator_account_id_type" text;--> statement-breakpoint
ALTER TABLE "moderation_history" ADD COLUMN "source" text;--> statement-breakpoint

-- Populate the new columns for existing data
-- IMPORTANT: This assumes that at this point in the script:
-- 1. "admin_id" has already been RENAMED to "moderator_account_id".
-- 2. "moderator_account_id" column currently holds the original plain admin_id values.
-- 3. "submissions" table still uses "tweet_id" as its primary key for joining.
UPDATE "moderation_history" AS mh
SET
  "moderator_account_id_type" = 'platform_username',
  "source" = CASE
               WHEN mh."moderator_account_id" = s."curator_username" THEN 'auto_approval'
               ELSE 'platform_comment'
             END,
  "moderator_account_id" = CONCAT('twitter:', s."curator_username")
FROM "submissions" AS s
WHERE mh."submission_id" = s."tweet_id"; --> statement-breakpoint

ALTER TABLE "moderation_history" ALTER COLUMN "moderator_account_id_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "moderation_history" ALTER COLUMN "source" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "moderation_history" ADD CONSTRAINT "moderation_history_submission_id_submissions_tweet_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("tweet_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_history_submission_idx" ON "moderation_history" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "moderation_history_moderator_account_idx" ON "moderation_history" USING btree ("moderator_account_id");
