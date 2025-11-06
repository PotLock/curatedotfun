ALTER TABLE "submission_feeds" DROP COLUMN "moderation_response_tweet_id";
ALTER TABLE "moderation_history" DROP COLUMN IF EXISTS "moderation_tweet_id";