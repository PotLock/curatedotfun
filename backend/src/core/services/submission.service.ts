import { BaseService } from './base.service';
import { SubmissionRepository } from '../repositories';
import { InsertSubmission, SelectSubmission, InsertModerationHistory, SelectModerationHistory, SubmissionStatus, SelectSubmissionFeed } from '../types';
import { ConfigurationError, DatabaseError, NotFoundError } from '../errors';
import { AppConfig } from '../../types/config';
import { TwitterService } from '../../services/twitter/client';
import { ProcessorService } from '../../services/processor/processor.service';
import { logger } from '../../utils/logger';
import { Tweet } from 'agent-twitter-client';

/**
 * Submission service interface
 */
export interface ISubmissionService {
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
   * Create a new submission
   * @param data Submission data
   * @returns Created submission
   */
  create(data: InsertSubmission): Promise<SelectSubmission>;

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

  /**
   * Initialize the submission service
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;

  /**
   * Start checking for mentions
   * @returns Promise that resolves when the check is started
   */
  startMentionsCheck(): Promise<void>;

  /**
   * Stop checking for mentions
   * @returns Promise that resolves when the check is stopped
   */
  stop(): Promise<void>;

  /**
   * Handle a submission tweet
   * @param tweet Submission tweet
   * @returns Promise that resolves when the submission is handled
   */
  handleSubmission(tweet: Tweet): Promise<void>;

  /**
   * Handle a moderation tweet
   * @param tweet Moderation tweet
   * @returns Promise that resolves when the moderation is handled
   */
  handleModeration(tweet: Tweet): Promise<void>;
}

/**
 * Submission service implementation
 */
export class SubmissionService extends BaseService<SelectSubmission, InsertSubmission, Partial<InsertSubmission>> implements ISubmissionService {
  private checkInterval: NodeJS.Timeout | null = null;
  private adminIdCache: Map<string, string> = new Map();

  /**
   * Constructor
   * @param submissionRepository Submission repository
   * @param twitterService Twitter service
   * @param processorService Processor service
   * @param config Application configuration
   */
  constructor(
    private readonly submissionRepository: SubmissionRepository,
    private readonly twitterService: TwitterService,
    private readonly processorService: ProcessorService,
    private readonly config: AppConfig
  ) {
    super(submissionRepository);
  }

  /**
   * Find a submission by curator tweet ID
   * @param curatorTweetId Curator tweet ID
   * @returns Submission or null if not found
   */
  async findByCuratorTweetId(curatorTweetId: string): Promise<SelectSubmission | null> {
    return this.submissionRepository.findByCuratorTweetId(curatorTweetId);
  }

  /**
   * Find submissions by user ID
   * @param userId User ID
   * @returns Array of submissions
   */
  async findByUserId(userId: string): Promise<SelectSubmission[]> {
    return this.submissionRepository.findByUserId(userId);
  }

  /**
   * Find submissions by curator ID
   * @param curatorId Curator ID
   * @returns Array of submissions
   */
  async findByCuratorId(curatorId: string): Promise<SelectSubmission[]> {
    return this.submissionRepository.findByCuratorId(curatorId);
  }

  /**
   * Find submissions by feed ID
   * @param feedId Feed ID
   * @param status Optional status filter
   * @returns Array of submissions
   */
  async findByFeedId(feedId: string, status?: SubmissionStatus): Promise<SelectSubmission[]> {
    return this.submissionRepository.findByFeedId(feedId, status);
  }

  /**
   * Save moderation action
   * @param moderation Moderation action data
   * @returns Created moderation action
   */
  async saveModerationAction(moderation: InsertModerationHistory): Promise<SelectModerationHistory> {
    return this.submissionRepository.saveModerationAction(moderation);
  }

  /**
   * Get moderation history for a submission
   * @param submissionId Submission ID
   * @returns Array of moderation actions
   */
  async getModerationHistory(submissionId: string): Promise<SelectModerationHistory[]> {
    return this.submissionRepository.getModerationHistory(submissionId);
  }

  /**
   * Get total posts count
   * @returns Total posts count
   */
  async getPostsCount(): Promise<number> {
    return this.submissionRepository.getPostsCount();
  }

  /**
   * Get total curators count
   * @returns Total curators count
   */
  async getCuratorsCount(): Promise<number> {
    return this.submissionRepository.getCuratorsCount();
  }

  /**
   * Initialize the submission service
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    try {
      // Initialize admin IDs with caching
      await this.initializeAdminIds();
    } catch (error) {
      logger.error("Failed to initialize submission service:", error);
      throw error;
    }
  }

  /**
   * Start checking for mentions
   * @returns Promise that resolves when the check is started
   */
  async startMentionsCheck(): Promise<void> {
    // Do an immediate check
    await this.checkMentions();

    // Then check mentions periodically
    this.checkInterval = setInterval(async () => {
      await this.checkMentions();
    }, 60000); // every minute
  }

  /**
   * Stop checking for mentions
   * @returns Promise that resolves when the check is stopped
   */
  async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check for new mentions
   * @private
   */
  private async checkMentions(): Promise<void> {
    try {
      logger.info("Checking mentions...");
      const newTweets = await this.twitterService.fetchAllNewMentions();

      if (newTweets.length === 0) {
        logger.info("No new mentions");
        return;
      }

      logger.info(`Found ${newTweets.length} new mentions`);

      // Process new tweets
      for (const tweet of newTweets) {
        if (!tweet.id) continue;

        try {
          if (this.isSubmission(tweet)) {
            // submission
            logger.info(`Received new submission: ${tweet.id}`);
            await this.handleSubmission(tweet);
          } else if (this.isModeration(tweet)) {
            // or moderation
            logger.info(`Received new moderation: ${tweet.id}`);
            await this.handleModeration(tweet);
          }
        } catch (error) {
          logger.error("Error processing tweet:", error);
        }
      }
    } catch (error) {
      logger.error("Error checking mentions:", error);
    }
  }

  /**
   * Handle a submission tweet
   * @param tweet Submission tweet
   * @returns Promise that resolves when the submission is handled
   */
  async handleSubmission(tweet: Tweet): Promise<void> {
    const userId = tweet.userId;
    if (!userId || !tweet.id) return; // no user or tweet

    const inReplyToId = tweet.inReplyToStatusId;
    if (!inReplyToId) {
      logger.error(`${tweet.id}: Submission is not a reply to another tweet`);
      return;
    }

    try {
      // Fetch full curator tweet data to ensure we have the username
      const curatorTweet = await this.twitterService.getTweet(tweet.id);
      if (!curatorTweet || !curatorTweet.username) {
        logger.error(`${tweet.id}: Could not fetch curator tweet details`);
        return;
      }

      if (
        curatorTweet.username.toLowerCase() === this.config.global.botId.toLowerCase() || // if self
        this.config.global.blacklist["twitter"].some(
          (blacklisted) => blacklisted.toLowerCase() === curatorTweet.username?.toLowerCase()
        )
      ) {
        logger.error(`${tweet.id}: Submitted by bot or blacklisted user`);
        return;
      }

      // Extract feed IDs from hashtags
      const feedIds = (tweet.hashtags || []).filter((tag) =>
        this.config.feeds.some(
          (feed) => feed.id.toLowerCase() === tag.toLowerCase()
        )
      );

      // Fetch original tweet
      const originalTweet = await this.twitterService.getTweet(inReplyToId);
      if (!originalTweet) {
        logger.error(`${tweet.id}: Could not fetch original tweet ${inReplyToId}`);
        return;
      }

      // Check if this tweet was already submitted
      const existingSubmission = await this.findById(originalTweet.id!);
      const existingFeeds = existingSubmission?.feeds ?? [];

      // Create new submission if it doesn't exist
      let submission: SelectSubmission | undefined;
      if (!existingSubmission) {
        const dailyCount = await this.submissionRepository.getDailySubmissionCount(userId);
        const maxSubmissions = this.config.global.maxDailySubmissionsPerUser;

        if (dailyCount >= maxSubmissions) {
          logger.error(`${tweet.id}: User ${userId} has reached limit.`);
          return;
        }

        // Extract curator notes
        const curatorNotes = this.extractDescription(originalTweet.username!, tweet);
        
        // Create submission data
        const submissionData: InsertSubmission = {
          tweetId: originalTweet.id!,
          userId: originalTweet.userId!,
          username: originalTweet.username!,
          content: originalTweet.text || "",
          curatorId: userId,
          curatorUsername: curatorTweet.username,
          curatorNotes,
          curatorTweetId: tweet.id,
          submittedAt: new Date().toISOString(),
        };

        // Create submission
        submission = await this.create(submissionData);
        await this.submissionRepository.incrementDailySubmissionCount(userId);
      }

      // Process each feed
      for (const feedId of [...feedIds, "all"]) {
        const lowercaseFeedId = feedId.toLowerCase();
        const feed = this.config.feeds.find(
          (f) => f.id.toLowerCase() === lowercaseFeedId
        );
        
        if (!feed) {
          logger.error(`${tweet.id}: Unable to find matching feed for ${feedId}`);
          continue;
        }

        const isModerator = feed.moderation.approvers.twitter.some(
          (approver) => approver.toLowerCase() === curatorTweet.username!.toLowerCase()
        );
        
        const existingFeed = existingFeeds.find(
          (f: SelectSubmissionFeed) => f.feedId.toLowerCase() === lowercaseFeedId
        );

        if (existingFeed) {
          // If feed already exists and is pending, check if new curator is moderator
          if (existingFeed.status === SubmissionStatus.PENDING && isModerator) {
            // Save moderation action first
            const moderation: InsertModerationHistory = {
              adminId: curatorTweet.username!,
              action: "approve",
              tweetId: originalTweet.id!,
              feedId: feed.id,
              note: this.extractDescription(originalTweet.username!, tweet) || null,
            };
            
            await this.saveModerationAction(moderation);

            // Then update feed status
            // TODO: Implement updateSubmissionFeedStatus in the repository
            // await this.submissionRepository.updateSubmissionFeedStatus(
            //   originalTweet.id!,
            //   feed.id,
            //   SubmissionStatus.APPROVED,
            //   tweet.id!
            // );

            if (feed.outputs.stream?.enabled) {
              await this.processorService.process(
                existingSubmission || submission!,
                feed.outputs.stream
              );
            }
          }
        } else {
          if (feed) {
            // TODO: Implement saveSubmissionToFeed in the repository
            // await this.submissionRepository.saveSubmissionToFeed(
            //   originalTweet.id!,
            //   feed.id,
            //   this.config.global.defaultStatus
            // );
          }

          // If moderator is submitting, process as an approval
          if (isModerator) {
            // Save moderation action first
            const moderation: InsertModerationHistory = {
              adminId: curatorTweet.username!,
              action: "approve",
              tweetId: originalTweet.id!,
              feedId: feed.id,
              note: this.extractDescription(originalTweet.username!, tweet) || null,
            };
            
            await this.saveModerationAction(moderation);

            // Then update feed status
            // TODO: Implement updateSubmissionFeedStatus in the repository
            // await this.submissionRepository.updateSubmissionFeedStatus(
            //   originalTweet.id!,
            //   feed.id,
            //   SubmissionStatus.APPROVED,
            //   tweet.id!
            // );

            if (feed.outputs.stream?.enabled) {
              await this.processorService.process(
                existingSubmission || submission!,
                feed.outputs.stream
              );
            }
          }
        }
      }

      await this.handleAcknowledgement(tweet);

      logger.info(`${tweet.id}: Successfully processed submission for tweet ${originalTweet.id}`);
    } catch (error) {
      logger.error(`${tweet.id}: Error while handling submission:`, error);
    }
  }

  /**
   * Handle a moderation tweet
   * @param tweet Moderation tweet
   * @returns Promise that resolves when the moderation is handled
   */
  async handleModeration(tweet: Tweet): Promise<void> {
    const userId = tweet.userId;
    if (!userId || !tweet.id) {
      logger.error(`${tweet.id} or ${userId} is not valid.`);
      return;
    }

    if (!this.isAdmin(userId)) {
      logger.error(`${tweet.id}: User ${userId} is not admin.`);
      return;
    }

    // Get the curator's tweet that the moderator is replying to
    const curatorTweetId = tweet.inReplyToStatusId;
    if (!curatorTweetId) return;

    const submission = await this.findByCuratorTweetId(curatorTweetId);
    if (!submission) {
      logger.error(`${tweet.id}: Received moderation for unsaved submission`);
      return;
    }

    const action = this.getModerationAction(tweet);
    if (!action) {
      logger.error(`${tweet.id}: No valid action determined`);
      return;
    }

    const adminUsername = this.adminIdCache.get(userId);
    if (!adminUsername) {
      logger.error(`${tweet.id}: Could not find username for admin ID ${userId}`);
      return;
    }

    // Get submission feeds to determine which feed is being moderated
    const pendingFeeds = submission.feeds?.filter(
      (feed: SelectSubmissionFeed) => feed.status === SubmissionStatus.PENDING
    ).filter((feed: SelectSubmissionFeed) => {
      const feedConfig = this.config.feeds.find(
        (f) => f.id === feed.feedId
      );
      return feedConfig?.moderation.approvers.twitter.some(
        (approver) => approver.toLowerCase() === adminUsername.toLowerCase()
      );
    }) || [];

    if (pendingFeeds.length === 0) {
      logger.info(`${tweet.id}: No pending feeds found for submission that this moderator can moderate`);
      return;
    }

    // Create moderation records for each feed this moderator can moderate
    for (const pendingFeed of pendingFeeds) {
      const moderation: InsertModerationHistory = {
        adminId: adminUsername,
        action,
        tweetId: submission.tweetId,
        feedId: pendingFeed.feedId,
        note: this.extractNote(submission.username, tweet) || null,
      };

      // Save moderation action
      await this.saveModerationAction(moderation);
    }

    // Process based on action
    if (action === "approve") {
      await this.processApproval(tweet, submission, pendingFeeds);
    } else {
      await this.processRejection(tweet, submission, pendingFeeds);
    }

    await this.handleAcknowledgement(tweet);
  }

  /**
   * Process an approval action
   * @param tweet Moderation tweet
   * @param submission Submission
   * @param pendingFeeds Pending feeds
   * @private
   */
  private async processApproval(
    tweet: Tweet,
    submission: SelectSubmission,
    pendingFeeds: SelectSubmissionFeed[]
  ): Promise<void> {
    try {
      // Process each pending feed
      for (const pendingFeed of pendingFeeds) {
        const feed = this.config.feeds.find(
          (f) => f.id === pendingFeed.feedId
        );
        if (!feed) continue;

        // Only update if not already moderated
        if (!pendingFeed.moderationResponseTweetId) {
          // TODO: Implement updateSubmissionFeedStatus in the repository
          // await this.submissionRepository.updateSubmissionFeedStatus(
          //   submission.tweetId,
          //   pendingFeed.feedId,
          //   SubmissionStatus.APPROVED,
          //   tweet.id!
          // );

          if (feed.outputs.stream?.enabled) {
            await this.processorService.process(
              submission,
              feed.outputs.stream
            );
          }
        }
      }
    } catch (error) {
      logger.error(`${submission.tweetId}: Failed to process approved submission:`, error);
    }
  }

  /**
   * Process a rejection action
   * @param tweet Moderation tweet
   * @param submission Submission
   * @param pendingFeeds Pending feeds
   * @private
   */
  private async processRejection(
    tweet: Tweet,
    submission: SelectSubmission,
    pendingFeeds: SelectSubmissionFeed[]
  ): Promise<void> {
    try {
      // Process each pending feed
      for (const pendingFeed of pendingFeeds) {
        // Only update if not already moderated
        if (!pendingFeed.moderationResponseTweetId) {
          // TODO: Implement updateSubmissionFeedStatus in the repository
          // await this.submissionRepository.updateSubmissionFeedStatus(
          //   submission.tweetId,
          //   pendingFeed.feedId,
          //   SubmissionStatus.REJECTED,
          //   tweet.id!
          // );
        }
      }
    } catch (error) {
      logger.error(`${submission.tweetId}: Failed to process rejected submission:`, error);
    }
  }

  /**
   * Handle acknowledgement of a tweet
   * @param tweet Tweet to acknowledge
   * @private
   */
  private async handleAcknowledgement(tweet: Tweet): Promise<void> {
    // Like the tweet
    await this.twitterService.likeTweet(tweet.id!);
  }

  /**
   * Initialize admin IDs
   * @private
   */
  private async initializeAdminIds(): Promise<void> {
    try {
      // Try to load admin IDs from cache first
      // TODO: Implement getTwitterCacheValue in the repository
      // const cachedAdminIds = await this.submissionRepository.getTwitterCacheValue("admin_ids");
      // if (cachedAdminIds) {
      //   try {
      //     const adminMap = JSON.parse(cachedAdminIds);
      //     for (const [userId, handle] of Object.entries(adminMap)) {
      //       this.adminIdCache.set(userId, handle as string);
      //     }
      //     logger.info("Loaded admin IDs from cache");
      //     return;
      //   } catch (error) {
      //     logger.error("Failed to parse cached admin IDs:", error);
      //   }
      // }

      // If no cache or parse error, fetch and cache admin IDs
      const adminHandles = new Set<string>();
      for (const feed of this.config.feeds) {
        for (const handle of feed.moderation.approvers.twitter) {
          adminHandles.add(handle);
        }
      }

      logger.info("Fetching admin IDs for the first time...");
      const adminMap: Record<string, string> = {};

      for (const handle of adminHandles) {
        try {
          const userId = await this.twitterService.getUserIdByScreenName(handle);
          this.adminIdCache.set(userId, handle);
          adminMap[userId] = handle;
        } catch (error) {
          logger.error(`Failed to fetch ID for admin handle @${handle}:`, error);
        }
      }

      // Cache the admin IDs
      // TODO: Implement setTwitterCacheValue in the repository
      // await this.submissionRepository.setTwitterCacheValue(
      //   "admin_ids",
      //   JSON.stringify(adminMap)
      // );
      logger.info("Cached admin IDs for future use");
    } catch (error) {
      logger.error("Failed to initialize admin IDs:", error);
      throw error;
    }
  }

  /**
   * Check if a user is an admin
   * @param userId User ID
   * @returns True if the user is an admin
   * @private
   */
  private isAdmin(userId: string): boolean {
    return this.adminIdCache.has(userId);
  }

  /**
   * Get the moderation action from a tweet
   * @param tweet Tweet
   * @returns Moderation action or null if not a moderation tweet
   * @private
   */
  private getModerationAction(tweet: Tweet): "approve" | "reject" | null {
    const text = tweet.text?.toLowerCase() || "";
    if (text.includes("!approve")) return "approve";
    if (text.includes("!reject")) return "reject";
    return null;
  }

  /**
   * Check if a tweet is a moderation tweet
   * @param tweet Tweet
   * @returns True if the tweet is a moderation tweet
   * @private
   */
  private isModeration(tweet: Tweet): boolean {
    return this.getModerationAction(tweet) !== null;
  }

  /**
   * Check if a tweet is a submission tweet
   * @param tweet Tweet
   * @returns True if the tweet is a submission tweet
   * @private
   */
  private isSubmission(tweet: Tweet): boolean {
    return tweet.text?.toLowerCase().includes("!submit") || false;
  }

  /**
   * Extract description from a tweet
   * @param username Username
   * @param tweet Tweet
   * @returns Description or null if not found
   * @private
   */
  private extractDescription(username: string, tweet: Tweet): string | null {
    const text = tweet.text
      ?.replace(/!submit\s+@\w+/i, "")
      .replace(new RegExp(`@${username}`, "i"), "")
      .replace(/#\w+/g, "")
      .trim();
    return text || null;
  }

  /**
   * Extract note from a tweet
   * @param username Username
   * @param tweet Tweet
   * @returns Note or null if not found
   * @private
   */
  private extractNote(username: string, tweet: Tweet): string | null {
    const text = tweet.text
      ?.replace(/#\w+/g, "")
      .replace(new RegExp(`@${this.config.global.botId}`, "i"), "")
      .replace(new RegExp(`@${username}`, "i"), "")
      .trim();
    return text || null;
  }

  /**
   * Perform business logic before creating a submission
   * @param data Submission data
   * @returns Processed submission data
   * @protected
   */
  protected async beforeCreate(data: InsertSubmission): Promise<InsertSubmission> {
    // Validate required fields
    if (!data.tweetId) {
      throw new ConfigurationError('Tweet ID is required');
    }

    if (!data.userId) {
      throw new ConfigurationError('User ID is required');
    }

    if (!data.username) {
      throw new ConfigurationError('Username is required');
    }

    if (!data.curatorId) {
      throw new ConfigurationError('Curator ID is required');
    }

    if (!data.curatorUsername) {
      throw new ConfigurationError('Curator username is required');
    }

    if (!data.curatorTweetId) {
      throw new ConfigurationError('Curator tweet ID is required');
    }

    // Check if submission with same ID already exists
    const existingSubmission = await this.findById(data.tweetId);
    if (existingSubmission) {
      throw new DatabaseError(`Submission with ID '${data.tweetId}' already exists`);
    }

    return data;
  }

  /**
   * Get resource name for error messages
   * @returns Resource name
   * @protected
   */
  protected getResourceName(): string {
    return 'Submission';
  }
}

// Create a singleton factory function
let submissionServiceInstance: SubmissionService | null = null;

/**
 * Get the submission service instance
 * @param submissionRepository Submission repository
 * @param twitterService Twitter service
 * @param processorService Processor service
 * @param config Application configuration
 * @returns Submission service instance
 */
export const getSubmissionService = (
  submissionRepository: SubmissionRepository,
  twitterService: TwitterService,
  processorService: ProcessorService,
  config: AppConfig
): SubmissionService => {
  if (!submissionServiceInstance) {
    submissionServiceInstance = new SubmissionService(
      submissionRepository,
      twitterService,
      processorService,
      config
    );
  }
  return submissionServiceInstance;
};
