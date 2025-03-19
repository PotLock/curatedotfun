-- Initialize PostgreSQL schema based on Drizzle schema definitions
-- This script will run automatically when the PostgreSQL container starts

-- Create tables based on schema.ts definitions

-- Feeds Table
CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Submissions Table
CREATE TABLE IF NOT EXISTS submissions (
  tweet_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  curator_id TEXT NOT NULL,
  curator_username TEXT NOT NULL,
  curator_tweet_id TEXT NOT NULL,
  content TEXT NOT NULL,
  curator_notes TEXT,
  submitted_at TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS submissions_user_id_idx ON submissions(user_id);
CREATE INDEX IF NOT EXISTS submissions_submitted_at_idx ON submissions(submitted_at);

-- Submission Feeds Table
CREATE TABLE IF NOT EXISTS submission_feeds (
  submission_id TEXT NOT NULL REFERENCES submissions(tweet_id) ON DELETE CASCADE,
  feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  moderation_response_tweet_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (submission_id, feed_id)
);

CREATE INDEX IF NOT EXISTS submission_feeds_feed_idx ON submission_feeds(feed_id);

-- Moderation History Table
CREATE TABLE IF NOT EXISTS moderation_history (
  id SERIAL PRIMARY KEY,
  tweet_id TEXT NOT NULL REFERENCES submissions(tweet_id) ON DELETE CASCADE,
  feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS moderation_history_tweet_idx ON moderation_history(tweet_id);
CREATE INDEX IF NOT EXISTS moderation_history_admin_idx ON moderation_history(admin_id);
CREATE INDEX IF NOT EXISTS moderation_history_feed_idx ON moderation_history(feed_id);

-- Submission Counts Table
CREATE TABLE IF NOT EXISTS submission_counts (
  user_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  last_reset_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS submission_counts_date_idx ON submission_counts(last_reset_date);

-- Feed Plugins Table
CREATE TABLE IF NOT EXISTS feed_plugins (
  feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (feed_id, plugin_id)
);

CREATE INDEX IF NOT EXISTS feed_plugins_feed_idx ON feed_plugins(feed_id);
CREATE INDEX IF NOT EXISTS feed_plugins_plugin_idx ON feed_plugins(plugin_id);

-- Twitter Schema Tables
CREATE TABLE IF NOT EXISTS twitter_cookies (
  username TEXT PRIMARY KEY,
  cookies TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS twitter_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
