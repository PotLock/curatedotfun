ALTER TABLE "moderation_history" ADD COLUMN "moderation_tweet_id" text;

UPDATE "moderation_history" mh
  SET "moderation_tweet_id" = sf."moderation_response_tweet_id"
  FROM "submission_feeds" sf
  WHERE mh."tweet_id" = sf."submission_id"
    AND mh."feed_id" = sf."feed_id";

SELECT COUNT(*) FROM "moderation_history" WHERE "moderation_tweet_id" IS NULL;

-- ALTER TABLE "moderation_history" ALTER COLUMN "moderation_tweet_id" SET NOT NULL;