-- Test seed data for PostgreSQL
-- This file contains minimal test data for running tests

-- Clear existing data
TRUNCATE TABLE feeds CASCADE;
TRUNCATE TABLE submissions CASCADE;
TRUNCATE TABLE submission_feeds CASCADE;
TRUNCATE TABLE moderation_history CASCADE;
TRUNCATE TABLE feed_plugins CASCADE;
TRUNCATE TABLE submission_counts CASCADE;
TRUNCATE TABLE twitter_cookies CASCADE;
TRUNCATE TABLE twitter_cache CASCADE;

-- Insert test feeds
INSERT INTO feeds (id, name, description, created_at, updated_at)
VALUES 
  ('test-feed-1', 'Test Feed 1', 'A test feed for testing', NOW(), NOW()),
  ('test-feed-2', 'Test Feed 2', 'Another test feed for testing', NOW(), NOW()),
  ('test-feed-3', 'Test Feed 3', 'Yet another test feed for testing', NOW(), NOW());

-- Insert test submissions
INSERT INTO submissions (tweet_id, user_id, username, curator_id, curator_username, curator_tweet_id, content, curator_notes, submitted_at, created_at, updated_at)
VALUES 
  ('tweet-1', 'user-1', 'testuser1', 'curator-1', 'curator1', 'curator-tweet-1', 'Test tweet 1 content', NULL, NOW(), NOW(), NOW()),
  ('tweet-2', 'user-2', 'testuser2', 'curator-1', 'curator1', 'curator-tweet-2', 'Test tweet 2 content', 'Good content', NOW(), NOW(), NOW()),
  ('tweet-3', 'user-3', 'testuser3', 'curator-2', 'curator2', 'curator-tweet-3', 'Test tweet 3 content', NULL, NOW(), NOW(), NOW());

-- Insert test submission_feeds
INSERT INTO submission_feeds (submission_id, feed_id, status, moderation_response_tweet_id, created_at, updated_at)
VALUES 
  ('tweet-1', 'test-feed-1', 'pending', NULL, NOW(), NOW()),
  ('tweet-2', 'test-feed-1', 'approved', 'mod-tweet-1', NOW(), NOW()),
  ('tweet-2', 'test-feed-2', 'pending', NULL, NOW(), NOW()),
  ('tweet-3', 'test-feed-3', 'rejected', 'mod-tweet-2', NOW(), NOW());

-- Insert test moderation_history
INSERT INTO moderation_history (tweet_id, feed_id, admin_id, action, note, created_at, updated_at)
VALUES 
  ('tweet-2', 'test-feed-1', 'moderator-1', 'approve', 'Approved for feed 1', NOW(), NOW()),
  ('tweet-3', 'test-feed-3', 'moderator-2', 'reject', 'Rejected for feed 3', NOW(), NOW());

-- Insert test feed_plugins
INSERT INTO feed_plugins (feed_id, plugin_id, config, created_at, updated_at)
VALUES 
  ('test-feed-1', 'telegram', '{"channelId": "test-channel-1", "enabled": true}', NOW(), NOW()),
  ('test-feed-2', 'rss', '{"title": "Test RSS Feed", "enabled": true}', NOW(), NOW());

-- Insert test submission_counts
INSERT INTO submission_counts (user_id, count, last_reset_date, created_at, updated_at)
VALUES 
  ('user-1', 1, CURRENT_DATE, NOW(), NOW()),
  ('user-2', 1, CURRENT_DATE, NOW(), NOW()),
  ('user-3', 1, CURRENT_DATE, NOW(), NOW());
