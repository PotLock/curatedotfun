#!/usr/bin/env node

/**
 * SQLite to PostgreSQL Migration Script
 *
 * This script migrates data from a SQLite database to PostgreSQL.
 * It reads data from the SQLite database and inserts it into PostgreSQL.
 *
 * Usage:
 *   bun run scripts/migrate-sqlite-to-postgres.js
 *
 * Environment variables:
 *   SQLITE_PATH: Path to the SQLite database file (default: .db/submissions.sqlite)
 *   PG_CONNECTION_STRING: PostgreSQL connection string (default: postgresql://postgres:postgres@localhost:5432/curatedotfun)
 */

import Database from "bun:sqlite";
import pg from "pg";
import fs from "fs";
import path from "path";

// Configuration
const SQLITE_PATH = process.env.SQLITE_PATH || ".db/submissions.sqlite";
const PG_CONNECTION_STRING =
  process.env.PG_CONNECTION_STRING ||
  "postgresql://postgres:postgres@localhost:5432/curatedotfun";

// Check if SQLite file exists
if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`SQLite database file not found: ${SQLITE_PATH}`);
  process.exit(1);
}

// Connect to databases
console.log(`Connecting to SQLite database: ${SQLITE_PATH}`);
const sqlite = new Database(SQLITE_PATH);

console.log(`Connecting to PostgreSQL database: ${PG_CONNECTION_STRING}`);
const pgClient = new pg.Client({
  connectionString: PG_CONNECTION_STRING,
});

async function migrateData() {
  try {
    await pgClient.connect();
    console.log("Connected to PostgreSQL");

    // Begin transaction
    await pgClient.query("BEGIN");

    // Migrate feeds
    console.log("Migrating feeds...");
    const feeds = sqlite.prepare("SELECT * FROM feeds").all();
    for (const feed of feeds) {
      await pgClient.query(
        "INSERT INTO feeds (id, name, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING",
        [
          feed.id,
          feed.name,
          feed.description,
          feed.created_at,
          feed.updated_at,
        ],
      );
    }
    console.log(`Migrated ${feeds.length} feeds`);

    // Migrate submissions
    console.log("Migrating submissions...");
    const submissions = sqlite.prepare("SELECT * FROM submissions").all();
    for (const submission of submissions) {
      await pgClient.query(
        "INSERT INTO submissions (tweet_id, user_id, username, curator_id, curator_username, curator_tweet_id, content, curator_notes, submitted_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (tweet_id) DO NOTHING",
        [
          submission.tweet_id,
          submission.user_id,
          submission.username,
          submission.curator_id,
          submission.curator_username,
          submission.curator_tweet_id,
          submission.content,
          submission.curator_notes,
          submission.submitted_at,
          submission.created_at,
          submission.updated_at,
        ],
      );
    }
    console.log(`Migrated ${submissions.length} submissions`);

    // Migrate submission_feeds
    console.log("Migrating submission_feeds...");
    const submissionFeeds = sqlite
      .prepare("SELECT * FROM submission_feeds")
      .all();
    let migratedSubmissionFeeds = 0;
    let skippedSubmissionFeeds = 0;

    // First, get all valid submission IDs from PostgreSQL
    const submissionResult = await pgClient.query(
      "SELECT tweet_id FROM submissions",
    );
    const validSubmissionIds = new Set(
      submissionResult.rows.map((row) => row.tweet_id),
    );

    // Then, get all valid feed IDs from PostgreSQL
    const feedResult = await pgClient.query("SELECT id FROM feeds");
    const validFeedIds = new Set(feedResult.rows.map((row) => row.id));

    for (const sf of submissionFeeds) {
      // Check if both submission_id and feed_id exist in their respective tables
      if (
        validSubmissionIds.has(sf.submission_id) &&
        validFeedIds.has(sf.feed_id)
      ) {
        try {
          await pgClient.query(
            "INSERT INTO submission_feeds (submission_id, feed_id, status, moderation_response_tweet_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (submission_id, feed_id) DO NOTHING",
            [
              sf.submission_id,
              sf.feed_id,
              sf.status,
              sf.moderation_response_tweet_id,
              sf.created_at,
              sf.updated_at,
            ],
          );
          migratedSubmissionFeeds++;
        } catch (error) {
          console.error(
            `Error migrating submission_feed (${sf.submission_id}, ${sf.feed_id}):`,
            error.message,
          );
          skippedSubmissionFeeds++;
        }
      } else {
        skippedSubmissionFeeds++;
      }
    }
    console.log(
      `Migrated ${migratedSubmissionFeeds} submission_feeds (skipped ${skippedSubmissionFeeds})`,
    );

    // Migrate moderation_history
    console.log("Migrating moderation_history...");
    const moderationHistory = sqlite
      .prepare("SELECT * FROM moderation_history")
      .all();
    let migratedModerationHistory = 0;
    let skippedModerationHistory = 0;

    for (const mh of moderationHistory) {
      // Check if both tweet_id and feed_id exist in their respective tables
      if (validSubmissionIds.has(mh.tweet_id) && validFeedIds.has(mh.feed_id)) {
        try {
          await pgClient.query(
            "INSERT INTO moderation_history (tweet_id, feed_id, admin_id, action, note, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              mh.tweet_id,
              mh.feed_id,
              mh.admin_id,
              mh.action,
              mh.note,
              mh.created_at,
              mh.updated_at,
            ],
          );
          migratedModerationHistory++;
        } catch (error) {
          console.error(
            `Error migrating moderation_history for tweet ${mh.tweet_id}:`,
            error.message,
          );
          skippedModerationHistory++;
        }
      } else {
        skippedModerationHistory++;
      }
    }
    console.log(
      `Migrated ${migratedModerationHistory} moderation_history records (skipped ${skippedModerationHistory})`,
    );

    // Migrate submission_counts
    console.log("Migrating submission_counts...");
    const submissionCounts = sqlite
      .prepare("SELECT * FROM submission_counts")
      .all();
    for (const sc of submissionCounts) {
      await pgClient.query(
        "INSERT INTO submission_counts (user_id, count, last_reset_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO NOTHING",
        [
          sc.user_id,
          sc.count,
          sc.last_reset_date,
          sc.created_at,
          sc.updated_at,
        ],
      );
    }
    console.log(`Migrated ${submissionCounts.length} submission_counts`);

    // Migrate feed_plugins
    console.log("Migrating feed_plugins...");
    const feedPlugins = sqlite.prepare("SELECT * FROM feed_plugins").all();
    for (const fp of feedPlugins) {
      await pgClient.query(
        "INSERT INTO feed_plugins (feed_id, plugin_id, config, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (feed_id, plugin_id) DO NOTHING",
        [fp.feed_id, fp.plugin_id, fp.config, fp.created_at, fp.updated_at],
      );
    }
    console.log(`Migrated ${feedPlugins.length} feed_plugins`);

    // Migrate twitter_cookies
    console.log("Migrating twitter_cookies...");
    const twitterCookies = sqlite
      .prepare("SELECT * FROM twitter_cookies")
      .all();
    for (const tc of twitterCookies) {
      await pgClient.query(
        "INSERT INTO twitter_cookies (username, cookies, created_at, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING",
        [tc.username, tc.cookies, tc.created_at, tc.updated_at],
      );
    }
    console.log(`Migrated ${twitterCookies.length} twitter_cookies`);

    // Migrate twitter_cache
    console.log("Migrating twitter_cache...");
    const twitterCache = sqlite.prepare("SELECT * FROM twitter_cache").all();
    for (const tc of twitterCache) {
      await pgClient.query(
        "INSERT INTO twitter_cache (key, value, created_at, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING",
        [tc.key, tc.value, tc.created_at, tc.updated_at],
      );
    }
    console.log(`Migrated ${twitterCache.length} twitter_cache entries`);

    // Commit transaction
    await pgClient.query("COMMIT");
    console.log("Migration completed successfully");
  } catch (error) {
    // Rollback transaction on error
    await pgClient.query("ROLLBACK");
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    // Close connections
    sqlite.close();
    await pgClient.end();
  }
}

// Run migration
migrateData();
