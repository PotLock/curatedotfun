import Database from "better-sqlite3";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { join } from "path";

import { logger } from "../../utils/logger";

import * as queries from "./queries";

// Twitter
import {
  Moderation,
  SubmissionFeed,
  SubmissionStatus,
  TwitterCookie,
  TwitterSubmission,
} from "../../types/twitter";
import * as twitterQueries from "../twitter/queries";
export class DatabaseService {
  private db: BetterSQLite3Database;
  private static readonly DB_PATH = (() => {
    const url = process.env.DATABASE_URL;
    if (url) {
      try {
        new URL(url);
        return url;
      } catch (e: any) {
        throw new Error(`Invalid DATABASE_URL: ${url}`);
      }
    }
    return `file:${join(process.cwd(), ".db", "submissions.sqlite")}`;
  })();

  constructor() {
    try {
      const dbPath = DatabaseService.DB_PATH.replace("file:", "");
      const sqlite = new Database(dbPath);
      this.db = drizzle(sqlite);
    } catch (e: any) {
      logger.error("Failed to initialize database:", {
        error: e,
        path: DatabaseService.DB_PATH,
        dirname: __dirname,
        cwd: process.cwd(),
      });
      throw new Error(`Database initialization failed: ${e.message}`);
    }
  }

  saveSubmission(submission: TwitterSubmission): void {
    queries.saveSubmission(this.db, submission);
  }

  saveModerationAction(moderation: Moderation): void {
    queries.saveModerationAction(this.db, moderation);
  }

  updateSubmissionFeedStatus(
    submissionId: string,
    feedId: string,
    status: SubmissionStatus,
    moderationResponseTweetId: string,
  ): void {
    queries.updateSubmissionFeedStatus(
      this.db,
      submissionId,
      feedId,
      status,
      moderationResponseTweetId,
    );
  }

  getSubmission(tweetId: string): TwitterSubmission | null {
    return queries.getSubmission(this.db, tweetId);
  }

  getSubmissionByCuratorTweetId(
    curatorTweetId: string,
  ): TwitterSubmission | null {
    return queries.getSubmissionByCuratorTweetId(this.db, curatorTweetId);
  }

  getAllSubmissions(limit?: number, offset?: number): TwitterSubmission[] {
    return queries.getAllSubmissions(this.db, limit, offset);
  }

  getDailySubmissionCount(userId: string): number {
    const today = new Date().toISOString().split("T")[0];
    // Clean up old entries first
    queries.cleanupOldSubmissionCounts(this.db, today);
    return queries.getDailySubmissionCount(this.db, userId, today);
  }

  incrementDailySubmissionCount(userId: string): void {
    queries.incrementDailySubmissionCount(this.db, userId);
  }

  upsertFeeds(
    feeds: { id: string; name: string; description?: string }[],
  ): void {
    queries.upsertFeeds(this.db, feeds);
  }

  saveSubmissionToFeed(
    submissionId: string,
    feedId: string,
    status: SubmissionStatus = SubmissionStatus.PENDING,
  ): void {
    queries.saveSubmissionToFeed(this.db, submissionId, feedId, status);
  }

  getFeedsBySubmission(submissionId: string): SubmissionFeed[] {
    return queries.getFeedsBySubmission(this.db, submissionId);
  }

  removeFromSubmissionFeed(submissionId: string, feedId: string): void {
    queries.removeFromSubmissionFeed(this.db, submissionId, feedId);
  }

  getSubmissionsByFeed(
    feedId: string,
  ): (TwitterSubmission & { status: SubmissionStatus })[] {
    return queries.getSubmissionsByFeed(this.db, feedId);
  }

  // Feed Plugin Management
  getFeedPlugin(feedId: string, pluginId: string) {
    return queries.getFeedPlugin(this.db, feedId, pluginId);
  }

  upsertFeedPlugin(
    feedId: string,
    pluginId: string,
    config: Record<string, any>,
  ) {
    return queries.upsertFeedPlugin(this.db, feedId, pluginId, config);
  }

  // Twitter Cookie Management
  setTwitterCookies(username: string, cookies: TwitterCookie[] | null): void {
    try {
      const cookiesJson = JSON.stringify(cookies);
      twitterQueries.setTwitterCookies(this.db, username, cookiesJson);
    } catch (error: any) {
      logger.error("Failed to set Twitter cookies:", { error, username });
      throw new Error(`Failed to set Twitter cookies: ${error.message}`);
    }
  }

  getTwitterCookies(username: string): TwitterCookie[] | null {
    try {
      const result = twitterQueries.getTwitterCookies(this.db, username);
      if (!result) return null;

      return JSON.parse(result.cookies) as TwitterCookie[];
    } catch (error: any) {
      logger.error("Error getting Twitter cookies:", { error, username });
      throw new Error(`Failed to get Twitter cookies: ${error.message}`);
    }
  }

  deleteTwitterCookies(username: string): void {
    try {
      twitterQueries.deleteTwitterCookies(this.db, username);
    } catch (error: any) {
      logger.error("Failed to delete Twitter cookies:", { error, username });
      throw new Error(`Failed to delete Twitter cookies: ${error.message}`);
    }
  }

  // Twitter Cache Management
  setTwitterCacheValue(key: string, value: string): void {
    try {
      twitterQueries.setTwitterCacheValue(this.db, key, value);
    } catch (error: any) {
      logger.error("Failed to set Twitter cache value:", { error, key });
      throw new Error(`Failed to set Twitter cache value: ${error.message}`);
    }
  }

  getTwitterCacheValue(key: string): string | null {
    try {
      const result = twitterQueries.getTwitterCacheValue(this.db, key);
      return result?.value ?? null;
    } catch (error: any) {
      logger.error("Failed to get Twitter cache value:", { error, key });
      throw new Error(`Failed to get Twitter cache value: ${error.message}`);
    }
  }

  deleteTwitterCacheValue(key: string): void {
    try {
      twitterQueries.deleteTwitterCacheValue(this.db, key);
    } catch (error: any) {
      logger.error("Failed to delete Twitter cache value:", { error, key });
      throw new Error(`Failed to delete Twitter cache value: ${error.message}`);
    }
  }

  clearTwitterCache(): void {
    try {
      twitterQueries.clearTwitterCache(this.db);
    } catch (error: any) {
      logger.error("Failed to clear Twitter cache:", { error });
      throw new Error(`Failed to clear Twitter cache: ${error.message}`);
    }
  }

  getLeaderboard(): queries.LeaderboardEntry[] {
    try {
      return queries.getLeaderboard(this.db);
    } catch (error: any) {
      logger.error("Failed to get leaderboard:", { error });
      throw new Error(`Failed to get leaderboard: ${error.message}`);
    }
  }

  getPostsCount(): number {
    try {
      return queries.getPostsCount(this.db);
    } catch (error: any) {
      logger.error("Failed to get posts count:", { error });
      return 0;
    }
  }

  getCuratorsCount(): number {
    try {
      return queries.getCuratorsCount(this.db);
    } catch (error: any) {
      logger.error("Failed to get curators count:", { error });
      return 0;
    }
  }
}

// Export a singleton instance
export const db = new DatabaseService();
