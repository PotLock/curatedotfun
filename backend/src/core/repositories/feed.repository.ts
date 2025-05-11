import { eq, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { InsertFeed, SelectFeed } from '../types';
import { DatabaseError } from '../errors';

/**
 * Feed repository for managing feed entities
 */
export class FeedRepository extends BaseRepository<SelectFeed, InsertFeed, Partial<InsertFeed>> {
  /**
   * Find feeds by name
   * @param name Feed name
   * @returns Array of feeds
   */
  async findByName(name: string): Promise<SelectFeed[]> {
    try {
      return await this.findByField('name', name);
    } catch (error) {
      throw new DatabaseError(`Failed to find feeds by name: ${(error as Error).message}`);
    }
  }

  /**
   * Find feeds by description
   * @param description Feed description
   * @returns Array of feeds
   */
  async findByDescription(description: string): Promise<SelectFeed[]> {
    try {
      return await this.findByField('description', description);
    } catch (error) {
      throw new DatabaseError(`Failed to find feeds by description: ${(error as Error).message}`);
    }
  }

  /**
   * Find feeds with submission counts
   * @returns Array of feeds with submission counts
   */
  async findWithSubmissionCounts(): Promise<(SelectFeed & { submissionCount: number })[]> {
    try {
      // This is an example of a custom query using the executeQuery method
      const result = await this.executeQuery<SelectFeed & { submissionCount: number }>((feedsTable) => {
        return this.db
          .select({
            ...feedsTable,
            submissionCount: sql`COUNT(sf.submission_id)::int`
          })
          .from(feedsTable)
          .leftJoin(
            'submission_feeds as sf',
            eq(feedsTable.id, sql`sf.feed_id`)
          )
          .groupBy(feedsTable.id)
          .orderBy(feedsTable.createdAt);
      });

      return result;
    } catch (error) {
      throw new DatabaseError(`Failed to find feeds with submission counts: ${(error as Error).message}`);
    }
  }

  /**
   * Update feed name
   * @param id Feed ID
   * @param name New name
   * @returns Updated feed
   */
  async updateName(id: string, name: string): Promise<SelectFeed> {
    return this.update(id, { name });
  }

  /**
   * Get resource name for error messages
   * @returns Resource name
   */
  protected getResourceName(): string {
    return 'Feed';
  }
}

// Create a singleton instance
let feedRepositoryInstance: FeedRepository | null = null;

/**
 * Get the feed repository instance
 * @param db Database connection
 * @param feedsTable Feeds table
 * @returns Feed repository instance
 */
export const getFeedRepository = (db: any, feedsTable: any): FeedRepository => {
  if (!feedRepositoryInstance) {
    feedRepositoryInstance = new FeedRepository(db, feedsTable);
  }
  return feedRepositoryInstance;
};
