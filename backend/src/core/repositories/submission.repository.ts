import { and, eq, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { InsertSubmission, SelectSubmission, InsertModerationHistory, SelectModerationHistory, SubmissionStatus } from '../types';
import { DatabaseError } from '../errors';

/**
 * Submission repository interface
 */
export interface ISubmissionRepository {
  /**
   * Find all submissions
   * @param options Query options
   * @returns Array of submissions
   */
  findAll(options?: any): Promise<SelectSubmission[]>;

  /**
   * Find a submission by ID
   * @param id Submission ID (tweet ID)
   * @returns Submission or null if not found
   */
  findById(id: string): Promise<SelectSubmission | null>;

  /**
   * Find a submission by curator tweet ID
   * @param curatorTweetId Curator tweet ID
   * @returns Submission or null if not found
   */
  findByCuratorTweetId(curatorTweetId: string): Promise<SelectSubmission | null>;

  /**
   * Find submissions by user ID
   * @param userId User ID
   * @returns Array of submissions
   */
  findByUserId(userId: string): Promise<SelectSubmission[]>;

  /**
   * Find submissions by curator ID
   * @param curatorId Curator ID
   * @returns Array of submissions
   */
  findByCuratorId(curatorId: string): Promise<SelectSubmission[]>;

  /**
   * Find submissions by feed ID
   * @param feedId Feed ID
   * @param status Optional status filter
   * @returns Array of submissions
   */
  findByFeedId(feedId: string, status?: SubmissionStatus): Promise<SelectSubmission[]>;

  /**
   * Get daily submission count for a user
   * @param userId User ID
   * @returns Daily submission count
   */
  getDailySubmissionCount(userId: string): Promise<number>;

  /**
   * Increment daily submission count for a user
   * @param userId User ID
   * @returns Updated count
   */
  incrementDailySubmissionCount(userId: string): Promise<number>;

  /**
   * Save moderation action
   * @param moderation Moderation action data
   * @returns Created moderation action
   */
  saveModerationAction(moderation: InsertModerationHistory): Promise<SelectModerationHistory>;

  /**
   * Get moderation history for a submission
   * @param submissionId Submission ID
   * @returns Array of moderation actions
   */
  getModerationHistory(submissionId: string): Promise<SelectModerationHistory[]>;

  /**
   * Get total posts count
   * @returns Total posts count
   */
  getPostsCount(): Promise<number>;

  /**
   * Get total curators count
   * @returns Total curators count
   */
  getCuratorsCount(): Promise<number>;
}

/**
 * Submission repository implementation
 */
export class SubmissionRepository extends BaseRepository<SelectSubmission, InsertSubmission, Partial<InsertSubmission>> implements ISubmissionRepository {
  /**
   * Constructor
   * @param db Database connection
   * @param submissionsTable Submissions table
   * @param submissionFeedsTable Submission feeds table
   * @param moderationHistoryTable Moderation history table
   * @param submissionCountsTable Submission counts table
   */
  constructor(
    protected readonly db: any,
    protected readonly submissionsTable: any,
    private readonly submissionFeedsTable: any,
    private readonly moderationHistoryTable: any,
    private readonly submissionCountsTable: any
  ) {
    super(db, submissionsTable, 'tweetId' as keyof SelectSubmission);
  }

  /**
   * Find a submission by curator tweet ID
   * @param curatorTweetId Curator tweet ID
   * @returns Submission or null if not found
   */
  async findByCuratorTweetId(curatorTweetId: string): Promise<SelectSubmission | null> {
    try {
      const result = await this.db
        .select()
        .from(this.table)
        .where(eq(this.table.curatorTweetId, curatorTweetId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const submission = result[0];
      
      // Get associated feeds
      const feeds = await this.db
        .select()
        .from(this.submissionFeedsTable)
        .where(eq(this.submissionFeedsTable.submissionId, submission.tweetId));
      
      submission.feeds = feeds;
      
      return submission;
    } catch (error) {
      throw new DatabaseError(`Failed to find submission by curator tweet ID: ${(error as Error).message}`);
    }
  }

  /**
   * Find submissions by user ID
   * @param userId User ID
   * @returns Array of submissions
   */
  async findByUserId(userId: string): Promise<SelectSubmission[]> {
    try {
      return await this.findByField('userId', userId);
    } catch (error) {
      throw new DatabaseError(`Failed to find submissions by user ID: ${(error as Error).message}`);
    }
  }

  /**
   * Find submissions by curator ID
   * @param curatorId Curator ID
   * @returns Array of submissions
   */
  async findByCuratorId(curatorId: string): Promise<SelectSubmission[]> {
    try {
      return await this.findByField('curatorId', curatorId);
    } catch (error) {
      throw new DatabaseError(`Failed to find submissions by curator ID: ${(error as Error).message}`);
    }
  }

  /**
   * Find submissions by feed ID
   * @param feedId Feed ID
   * @param status Optional status filter
   * @returns Array of submissions
   */
  async findByFeedId(feedId: string, status?: SubmissionStatus): Promise<SelectSubmission[]> {
    try {
      // This is a more complex query that joins tables
      let query = this.db
        .select({
          submission: this.table,
        })
        .from(this.table)
        .innerJoin(
          this.submissionFeedsTable,
          eq(this.table.tweetId, this.submissionFeedsTable.submissionId)
        )
        .where(eq(this.submissionFeedsTable.feedId, feedId));

      if (status) {
        query = query.where(eq(this.submissionFeedsTable.status, status));
      }

      const result = await query;
      
      // Extract submissions from result
      return result.map((r: any) => r.submission);
    } catch (error) {
      throw new DatabaseError(`Failed to find submissions by feed ID: ${(error as Error).message}`);
    }
  }

  /**
   * Get daily submission count for a user
   * @param userId User ID
   * @returns Daily submission count
   */
  async getDailySubmissionCount(userId: string): Promise<number> {
    try {
      // First clean up old counts
      await this.cleanupOldSubmissionCounts();

      // Then get the count
      const result = await this.db
        .select()
        .from(this.submissionCountsTable)
        .where(eq(this.submissionCountsTable.userId, userId))
        .limit(1);

      if (result.length === 0) {
        return 0;
      }

      return result[0].count;
    } catch (error) {
      throw new DatabaseError(`Failed to get daily submission count: ${(error as Error).message}`);
    }
  }

  /**
   * Increment daily submission count for a user
   * @param userId User ID
   * @returns Updated count
   */
  async incrementDailySubmissionCount(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if user has a count record for today
      const existingCount = await this.db
        .select()
        .from(this.submissionCountsTable)
        .where(eq(this.submissionCountsTable.userId, userId))
        .limit(1);

      if (existingCount.length === 0) {
        // Create new count record
        const result = await this.db
          .insert(this.submissionCountsTable)
          .values({
            userId,
            count: 1,
            lastResetDate: today,
          })
          .returning();

        return result[0].count;
      } else {
        // Update existing count record
        const currentCount = existingCount[0];
        
        // If last reset date is not today, reset count
        if (new Date(currentCount.lastResetDate).getTime() !== today.getTime()) {
          const result = await this.db
            .update(this.submissionCountsTable)
            .set({
              count: 1,
              lastResetDate: today,
            })
            .where(eq(this.submissionCountsTable.userId, userId))
            .returning();

          return result[0].count;
        } else {
          // Increment count
          const result = await this.db
            .update(this.submissionCountsTable)
            .set({
              count: currentCount.count + 1,
            })
            .where(eq(this.submissionCountsTable.userId, userId))
            .returning();

          return result[0].count;
        }
      }
    } catch (error) {
      throw new DatabaseError(`Failed to increment daily submission count: ${(error as Error).message}`);
    }
  }

  /**
   * Save moderation action
   * @param moderation Moderation action data
   * @returns Created moderation action
   */
  async saveModerationAction(moderation: InsertModerationHistory): Promise<SelectModerationHistory> {
    try {
      const result = await this.db
        .insert(this.moderationHistoryTable)
        .values(moderation)
        .returning();

      return result[0];
    } catch (error) {
      throw new DatabaseError(`Failed to save moderation action: ${(error as Error).message}`);
    }
  }

  /**
   * Get moderation history for a submission
   * @param submissionId Submission ID
   * @returns Array of moderation actions
   */
  async getModerationHistory(submissionId: string): Promise<SelectModerationHistory[]> {
    try {
      return await this.db
        .select()
        .from(this.moderationHistoryTable)
        .where(eq(this.moderationHistoryTable.tweetId, submissionId))
        .orderBy(this.moderationHistoryTable.createdAt);
    } catch (error) {
      throw new DatabaseError(`Failed to get moderation history: ${(error as Error).message}`);
    }
  }

  /**
   * Get total posts count
   * @returns Total posts count
   */
  async getPostsCount(): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql`count(*)` })
        .from(this.table);

      return Number(result[0].count);
    } catch (error) {
      throw new DatabaseError(`Failed to get posts count: ${(error as Error).message}`);
    }
  }

  /**
   * Get total curators count
   * @returns Total curators count
   */
  async getCuratorsCount(): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql`count(distinct curator_id)` })
        .from(this.table);

      return Number(result[0].count);
    } catch (error) {
      throw new DatabaseError(`Failed to get curators count: ${(error as Error).message}`);
    }
  }

  /**
   * Clean up old submission counts
   * @private
   */
  private async cleanupOldSubmissionCounts(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.db
        .update(this.submissionCountsTable)
        .set({
          count: 0,
          lastResetDate: today,
        })
        .where(sql`last_reset_date < ${today}`);
    } catch (error) {
      throw new DatabaseError(`Failed to clean up old submission counts: ${(error as Error).message}`);
    }
  }

  /**
   * Get resource name for error messages
   * @returns Resource name
   */
  protected getResourceName(): string {
    return 'Submission';
  }
}

// Create a singleton factory function
let submissionRepositoryInstance: SubmissionRepository | null = null;

/**
 * Get the submission repository instance
 * @param db Database connection
 * @param tables Database tables
 * @returns Submission repository instance
 */
export const getSubmissionRepository = (db: any, tables: any): SubmissionRepository => {
  if (!submissionRepositoryInstance) {
    submissionRepositoryInstance = new SubmissionRepository(
      db,
      tables.submissions,
      tables.submissionFeeds,
      tables.moderationHistory,
      tables.submissionCounts
    );
  }
  return submissionRepositoryInstance;
};
