import { BaseService } from './base.service';
import { FeedRepository } from '../repositories';
import { InsertFeed, SelectFeed } from '../types';
import { ConfigurationError, DatabaseError } from '../errors';

/**
 * Feed service interface
 */
export interface IFeedService {
  /**
   * Find all feeds
   * @param options Query options
   * @returns Array of feeds
   */
  findAll(options?: any): Promise<SelectFeed[]>;

  /**
   * Find a feed by ID
   * @param id Feed ID
   * @returns Feed or null if not found
   */
  findById(id: string): Promise<SelectFeed | null>;

  /**
   * Find a feed by ID or throw an error if not found
   * @param id Feed ID
   * @returns Feed
   */
  findByIdOrThrow(id: string): Promise<SelectFeed>;

  /**
   * Find feeds by name
   * @param name Feed name
   * @returns Array of feeds
   */
  findByName(name: string): Promise<SelectFeed[]>;

  /**
   * Find feeds with submission counts
   * @returns Array of feeds with submission counts
   */
  findWithSubmissionCounts(): Promise<(SelectFeed & { submissionCount: number })[]>;

  /**
   * Create a new feed
   * @param data Feed data
   * @returns Created feed
   */
  create(data: InsertFeed): Promise<SelectFeed>;

  /**
   * Update a feed
   * @param id Feed ID
   * @param data Feed data
   * @returns Updated feed
   */
  update(id: string, data: Partial<InsertFeed>): Promise<SelectFeed>;

  /**
   * Update feed name
   * @param id Feed ID
   * @param name New name
   * @returns Updated feed
   */
  updateName(id: string, name: string): Promise<SelectFeed>;

  /**
   * Delete a feed
   * @param id Feed ID
   * @returns Deleted feed
   */
  delete(id: string): Promise<SelectFeed>;
}

/**
 * Feed service implementation
 */
export class FeedService extends BaseService<SelectFeed, InsertFeed, Partial<InsertFeed>> implements IFeedService {
  /**
   * Constructor
   * @param feedRepository Feed repository
   */
  constructor(private readonly feedRepository: FeedRepository) {
    super(feedRepository);
  }

  /**
   * Find feeds by name
   * @param name Feed name
   * @returns Array of feeds
   */
  async findByName(name: string): Promise<SelectFeed[]> {
    return this.feedRepository.findByName(name);
  }

  /**
   * Find feeds with submission counts
   * @returns Array of feeds with submission counts
   */
  async findWithSubmissionCounts(): Promise<(SelectFeed & { submissionCount: number })[]> {
    return this.feedRepository.findWithSubmissionCounts();
  }

  /**
   * Update feed name
   * @param id Feed ID
   * @param name New name
   * @returns Updated feed
   */
  async updateName(id: string, name: string): Promise<SelectFeed> {
    return this.feedRepository.updateName(id, name);
  }

  /**
   * Perform business logic before creating a feed
   * @param data Feed data
   * @returns Processed feed data
   */
  protected async beforeCreate(data: InsertFeed): Promise<InsertFeed> {
    // Validate feed configuration
    if (!data.config) {
      throw new ConfigurationError('Feed configuration is required');
    }

    // Check if feed with same ID already exists
    if (data.id) {
      const existingFeed = await this.findById(data.id);
      if (existingFeed) {
        throw new DatabaseError(`Feed with ID '${data.id}' already exists`);
      }
    }

    return data;
  }

  /**
   * Perform business logic before updating a feed
   * @param id Feed ID
   * @param data Feed data
   * @returns Processed feed data
   */
  protected async beforeUpdate(id: string, data: Partial<InsertFeed>): Promise<Partial<InsertFeed>> {
    // Ensure feed exists
    await this.findByIdOrThrow(id);

    return data;
  }

  /**
   * Perform business logic before deleting a feed
   * @param id Feed ID
   */
  protected async beforeDelete(id: string): Promise<void> {
    // Ensure feed exists
    await this.findByIdOrThrow(id);

    // Additional business logic could be added here
    // For example, check if feed has any submissions before deleting
  }
}

// Create a singleton instance
let feedServiceInstance: FeedService | null = null;

/**
 * Get the feed service instance
 * @param feedRepository Feed repository
 * @returns Feed service instance
 */
export const getFeedService = (feedRepository: FeedRepository): FeedService => {
  if (!feedServiceInstance) {
    feedServiceInstance = new FeedService(feedRepository);
  }
  return feedServiceInstance;
};
