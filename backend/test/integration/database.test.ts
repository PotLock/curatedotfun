import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { db } from "../../src/services/db";
import { createMockSubmission } from "../utils/test-data";
import { SubmissionStatus } from "../../src/types/twitter";
import { Pool } from "pg";

describe("Database Integration", () => {
  let pgPool: Pool;

  beforeAll(async () => {
    try {
      // Set environment variables for test database
      process.env.DATABASE_URL =
        "postgresql://postgres:postgres@localhost:54321/test";
      process.env.DATABASE_WRITE_URL =
        "postgresql://postgres:postgres@localhost:54321/test";
      process.env.DATABASE_READ_URL =
        "postgresql://postgres:postgres@localhost:54321/test";

      // Create a direct connection to the test database for cleanup operations
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Initialize the database connection
      console.log("Initializing database service connection...");
      await db.connect();
      console.log("Database service connected successfully");

      // Verify database service connection
      const healthCheck = await db.healthCheck();
      console.log("Database health check:", healthCheck);

      if (healthCheck.status !== "ok") {
        throw new Error("Database health check failed");
      }

      // Verify tables exist
      const tables = await pgPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log(
        "Available tables:",
        tables.rows.map((row) => row.table_name).join(", "),
      );
    } catch (error) {
      console.error("Error in beforeAll:", error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Close the PostgreSQL connection
      if (pgPool) {
        await pgPool.end();
        console.log("PostgreSQL pool closed");
      }

      // Close the database service connection
      await db.disconnect();
      console.log("Database service disconnected");
    } catch (error) {
      console.error("Error in afterAll:", error);
    }
  });

  beforeEach(async () => {
    try {
      // Clean up tables before each test using direct SQL
      await pgPool.query("DELETE FROM submission_feeds");
      await pgPool.query("DELETE FROM moderation_history");
      await pgPool.query("DELETE FROM submissions");
      console.log("Tables cleaned up for test");
    } catch (error) {
      console.error("Error in beforeEach:", error);
      throw error;
    }
  });

  test("Should save and retrieve a submission", async () => {
    // Arrange
    const submission = createMockSubmission();

    // Act
    await db.saveSubmission(submission);

    // Assert
    const retrievedSubmission = await db.getSubmission(submission.tweetId);
    expect(retrievedSubmission).toMatchObject({
      tweetId: submission.tweetId,
      userId: submission.userId,
      username: submission.username,
      content: submission.content,
    });
  });

  test("Should update a submission feed status", async () => {
    // Arrange
    const submission = createMockSubmission();
    const feedId = "test-feed-1"; // Use existing feed from seed data

    // Save submission
    await db.saveSubmission(submission);

    // Add submission to feed
    await db.saveSubmissionToFeed(
      submission.tweetId,
      feedId,
      SubmissionStatus.PENDING,
    );

    // Act
    await db.updateSubmissionFeedStatus(
      submission.tweetId,
      feedId,
      SubmissionStatus.APPROVED,
      "moderator_tweet_id",
    );

    // Assert
    const feeds = await db.getFeedsBySubmission(submission.tweetId);
    const feed = feeds.find((f) => f.feedId === feedId);
    expect(feed).toBeDefined();
    expect(feed?.status).toBe(SubmissionStatus.APPROVED);
  });

  test("Should retrieve submissions by feed", async () => {
    // Arrange
    const feedId = "test-feed-2"; // Use existing feed from seed data
    const submissions = [
      createMockSubmission(),
      createMockSubmission(),
      createMockSubmission(),
    ];

    for (const submission of submissions) {
      await db.saveSubmission(submission);
      await db.saveSubmissionToFeed(
        submission.tweetId,
        feedId,
        SubmissionStatus.PENDING,
      );
    }

    // Act
    const retrievedSubmissions = await db.getSubmissionsByFeed(feedId);

    // Assert
    expect(retrievedSubmissions.length).toBe(submissions.length);
    for (const submission of submissions) {
      const found = retrievedSubmissions.some(
        (s) => s.tweetId === submission.tweetId,
      );
      expect(found).toBe(true);
    }
  });

  test("Should retrieve all submissions", async () => {
    // Arrange
    const submissions = [
      createMockSubmission(),
      createMockSubmission(),
      createMockSubmission(),
    ];

    // Add submissions with different statuses
    await db.saveSubmission(submissions[0]);
    await db.saveSubmissionToFeed(
      submissions[0].tweetId,
      "test-feed-1",
      SubmissionStatus.PENDING,
    );

    await db.saveSubmission(submissions[1]);
    await db.saveSubmissionToFeed(
      submissions[1].tweetId,
      "test-feed-1",
      SubmissionStatus.APPROVED,
    );

    await db.saveSubmission(submissions[2]);
    await db.saveSubmissionToFeed(
      submissions[2].tweetId,
      "test-feed-1",
      SubmissionStatus.REJECTED,
    );

    // Act - Get all submissions
    const allSubmissions = await db.getAllSubmissions();

    // Act - Get pending submissions
    const pendingSubmissions = await db.getAllSubmissions(
      SubmissionStatus.PENDING,
    );

    // Assert
    expect(allSubmissions.length).toBeGreaterThanOrEqual(3);
    expect(pendingSubmissions.length).toBeGreaterThanOrEqual(1);

    // Check that pending submissions have the correct status
    for (const submission of pendingSubmissions) {
      expect(
        submission.feedStatuses?.some(
          (f) => f.status === SubmissionStatus.PENDING,
        ),
      ).toBe(true);
    }
  });

  test("Should handle feed operations", async () => {
    // Arrange
    const submission = createMockSubmission();
    const feedId = "test-feed-3"; // Use existing feed from seed data

    // Save submission
    await db.saveSubmission(submission);

    // Add to feed
    await db.saveSubmissionToFeed(
      submission.tweetId,
      feedId,
      SubmissionStatus.PENDING,
    );

    // Assert feed was added
    let feeds = await db.getFeedsBySubmission(submission.tweetId);
    expect(feeds.length).toBe(1);
    expect(feeds[0].feedId).toBe(feedId);

    // Remove from feed
    await db.removeFromSubmissionFeed(submission.tweetId, feedId);

    // Assert feed was removed
    feeds = await db.getFeedsBySubmission(submission.tweetId);
    expect(feeds.length).toBe(0);
  });

  test("Should handle concurrent operations", async () => {
    // Arrange
    const submission = createMockSubmission();
    const feedId = "test-feed-3"; // Use existing feed from seed data

    await db.saveSubmission(submission);
    await db.saveSubmissionToFeed(
      submission.tweetId,
      feedId,
      SubmissionStatus.PENDING,
    );

    // Act - Run multiple operations concurrently
    const operations = [
      db.updateSubmissionFeedStatus(
        submission.tweetId,
        feedId,
        SubmissionStatus.APPROVED,
        "mod_tweet_id",
      ),
      db.getSubmission(submission.tweetId),
      db.getSubmissionsByFeed(feedId),
    ];

    // Assert - No errors should be thrown
    await Promise.all(operations);
  });
});
