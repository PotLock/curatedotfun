import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { join } from "path";

import { logger } from "../../utils/logger";

import { DBOperations } from "./operations";
import * as queries from "./queries";

// Twitter & RSS
import {
  Moderation,
  SubmissionFeed,
  SubmissionStatus,
  TwitterCookie,
  TwitterSubmission,
} from "../../types/twitter";
import * as rssQueries from "../rss/queries";
import * as twitterQueries from "../twitter/queries";
export class DatabaseService {
  private db: BetterSQLite3Database;
  private operations: DBOperations;
  private static readonly DB_PATH = (() => {
    const url = process.env.DATABASE_URL;
    if (url) {
      try {
        new URL(url);
        return url;
      } catch (e) {
        throw new Error(`Invalid DATABASE_URL: ${url}`);
      }
    }
    return `file:${join(process.cwd(), ".db", "submissions.sqlite")}`;
  })();

  constructor() {
    try {
      const dbPath = DatabaseService.DB_PATH.replace("file:", "");
      const sqlite = new Database(dbPath);
      this.db = drizzle(sqlite, { logger: process.env.NODE_ENV === "development" });
    } catch (e) {
      logger.error("Failed to initialize database:", e);
      throw new Error("Database initialization failed");
    }
    this.operations = new DBOperations(this.db);
  }

  getOperations(): DBOperations {
    return this.operations;
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

  async getSubmission(tweetId: string): Promise<TwitterSubmission | null> {
    return await queries.getSubmission(this.db, tweetId);
  }

  async getSubmissionByCuratorTweetId(
    curatorTweetId: string,
  ): Promise<TwitterSubmission | null> {
    return await queries.getSubmissionByCuratorTweetId(this.db, curatorTweetId);
  }

  async getAllSubmissions(
    limit?: number,
    offset?: number,
  ): Promise<TwitterSubmission[]> {
    return await queries.getAllSubmissions(this.db, limit, offset);
  }

  async getDailySubmissionCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    // Clean up old entries first
    await queries.cleanupOldSubmissionCounts(this.db, today);
    return queries.getDailySubmissionCount(this.db, userId, today);
  }

  async incrementDailySubmissionCount(userId: string): Promise<void> {
    await queries.incrementDailySubmissionCount(this.db, userId);
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

  async getFeedsBySubmission(submissionId: string): Promise<SubmissionFeed[]> {
    return await queries.getFeedsBySubmission(this.db, submissionId);
  }

  removeFromSubmissionFeed(submissionId: string, feedId: string): void {
    queries.removeFromSubmissionFeed(this.db, submissionId, feedId);
  }

  async getSubmissionsByFeed(
    feedId: string,
  ): Promise<(TwitterSubmission & { status: SubmissionStatus })[]> {
    return await queries.getSubmissionsByFeed(this.db, feedId);
  }

  // Feed Plugin Management
  async getFeedPlugin(feedId: string, pluginId: string) {
    return await queries.getFeedPlugin(this.db, feedId, pluginId);
  }

  async upsertFeedPlugin(
    feedId: string,
    pluginId: string,
    config: Record<string, any>,
  ) {
    return await queries.upsertFeedPlugin(this.db, feedId, pluginId, config);
  }

  // Twitter Cookie Management
  setTwitterCookies(username: string, cookies: TwitterCookie[] | null): void {
    const cookiesJson = JSON.stringify(cookies);
    twitterQueries.setTwitterCookies(this.db, username, cookiesJson).execute();
  }

  async getTwitterCookies(username: string): Promise<TwitterCookie[] | null> {
    const result = await twitterQueries.getTwitterCookies(this.db, username);
    if (!result) return null;

    try {
      return JSON.parse(result.cookies) as TwitterCookie[];
    } catch (e) {
      logger.error("Error parsing Twitter cookies:", e);
      return null;
    }
  }

  deleteTwitterCookies(username: string): void {
    twitterQueries.deleteTwitterCookies(this.db, username).execute();
  }

  // Twitter Cache Management
  setTwitterCacheValue(key: string, value: string): void {
    twitterQueries.setTwitterCacheValue(this.db, key, value).execute();
  }

  async getTwitterCacheValue(key: string): Promise<string | null> {
    const result = await twitterQueries.getTwitterCacheValue(this.db, key);
    return result?.value ?? null;
  }

  deleteTwitterCacheValue(key: string): void {
    twitterQueries.deleteTwitterCacheValue(this.db, key).execute();
  }

  clearTwitterCache(): void {
    twitterQueries.clearTwitterCache(this.db).execute();
  }

  // RSS Management
  saveRssItem(feedId: string, item: rssQueries.RssItem): void {
    rssQueries.saveRssItem(this.db, feedId, item).execute();
  }

  async getRssItems(
    feedId: string,
    limit?: number,
  ): Promise<rssQueries.RssItem[]> {
    return await rssQueries.getRssItems(this.db, feedId, limit);
  }

  deleteOldRssItems(feedId: string, limit: number): void {
    rssQueries.deleteOldRssItems(this.db, feedId, limit).execute();
  }
}

// Export a singleton instance
export const db = new DatabaseService();
