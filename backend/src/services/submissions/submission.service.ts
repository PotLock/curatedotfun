import { Tweet } from "agent-twitter-client";
import { AppConfig } from "../../types/config";
import {
  Moderation,
  Submission,
  SubmissionFeed,
  SubmissionStatus,
} from "../../types/twitter";
import { logger } from "../../utils/logger";
import {
  feedRepository,
  submissionRepository,
  twitterRepository,
} from "../db/repositories";
import { ProcessorService } from "../processor/processor.service";
import { TwitterService } from "../twitter/client";

export class SubmissionService {
  private checkInterval: NodeJS.Timeout | null = null;
  private adminIdCache: Map<string, string> = new Map();

  constructor(
    private readonly twitterService: TwitterService,
    private readonly processorService: ProcessorService,
    private readonly config: AppConfig,
  ) {}

  private async initializeAdminIds(): Promise<void> {
    try {
      // Try to load admin IDs from cache first
      const cachedAdminIds =
        await twitterRepository.getTwitterCacheValue("admin_ids");
      if (cachedAdminIds) {
        try {
          const adminMap = JSON.parse(cachedAdminIds);
          for (const [userId, handle] of Object.entries(adminMap)) {
            this.adminIdCache.set(userId, handle as string);
          }
          logger.info("Loaded admin IDs from cache");
          return;
        } catch (error) {
          logger.error("Failed to parse cached admin IDs:", error);
        }
      }

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
          const userId =
            await this.twitterService.getUserIdByScreenName(handle);
          this.adminIdCache.set(userId, handle);
          adminMap[userId] = handle;
        } catch (error) {
          logger.error(
            `Failed to fetch ID for admin handle @${handle}:`,
            error,
          );
        }
      }

      // Cache the admin IDs
      await twitterRepository.setTwitterCacheValue(
        "admin_ids",
        JSON.stringify(adminMap),
      );
      logger.info("Cached admin IDs for future use");
    } catch (error) {
      logger.error("Failed to initialize admin IDs:", error);
      throw error;
    }
  }

  private async initializeFeeds(): Promise<void> {
    try {
      const feedsToUpsert = this.config.feeds.map((feed) => ({
        id: feed.id,
        name: feed.name,
        description: feed.description,
      }));
      await feedRepository.upsertFeeds(feedsToUpsert);
    } catch (error) {
      logger.error("Failed to initialize feeds:", error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      // Initialize feeds
      await this.initializeFeeds();

      // Initialize admin IDs with caching
      await this.initializeAdminIds();
    } catch (error) {
      logger.error("Failed to initialize submission service:", error);
      throw error;
    }
  }

  async startMentionsCheck(): Promise<void> {
    // Do an immediate check
    await this.checkMentions();

    // Then check mentions
    this.checkInterval = setInterval(async () => {
      await this.checkMentions();
    }, 60000); // every minute
  }

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

        // we have mentions, which can hold actions
        // !submit, !approve, !reject
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

  async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async handleSubmission(tweet: Tweet): Promise<void> {
    const userId = tweet.userId;
    if (!userId || !tweet.id) return; // no user or tweet

    const inReplyToId = tweet.inReplyToStatusId; // this is specific to twitter (TODO: id of { platform: twitter })
    if (!inReplyToId) {
      logger.error(`${tweet.id}: Submission is not a reply to another tweet`);
      return;
    }

    try {
      // Fetch full curator tweet data to ensure we have the username
      const curatorTweet = await this.twitterService.getTweet(tweet.id!);
      if (!curatorTweet || !curatorTweet.username) {
        logger.error(`${tweet.id}: Could not fetch curator tweet details`);
        return;
      }

      if (
        curatorTweet.username.toLowerCase() ===
          this.config.global.botId.toLowerCase() || // if self
        this.config.global.blacklist["twitter"].some(
          (blacklisted) =>
            blacklisted.toLowerCase() === curatorTweet.username?.toLowerCase(),
        )
      ) {
        logger.error(`${tweet.id}: Submitted by bot or blacklisted user`);
        // or blacklisted
        return;
      }

      // Extract feed IDs from hashtags
      const feedIds = (tweet.hashtags || []).filter((tag) =>
        this.config.feeds.some(
          (feed) => feed.id.toLowerCase() === tag.toLowerCase(),
        ),
      );

      // If no feeds specified, reject submission
      if (feedIds.length === 0) {
        // await this.twitterService.replyToTweet(
        //   tweet.id,
        //   `Please specify at least one valid feed using hashtags (e.g. #grants, #ethereum, #near)`,
        // );
        logger.error(`${tweet.id}: Provided invalid feeds, ${feedIds}`);
        return;
      }

      // Fetch original tweet
      const originalTweet = await this.twitterService.getTweet(inReplyToId);
      if (!originalTweet) {
        logger.error(
          `${tweet.id}: Could not fetch original tweet ${inReplyToId}`,
        );
        return;
      }

      // Check if this tweet was already submitted
      const existingSubmission = await submissionRepository.getSubmission(
        originalTweet.id!,
      );
      const existingFeeds = existingSubmission?.feeds || [];

      // Create new submission if it doesn't exist
      let submission: Submission | undefined;
      if (!existingSubmission) {
        const dailyCount =
          await submissionRepository.getDailySubmissionCount(userId);
        const maxSubmissions = this.config.global.maxDailySubmissionsPerUser;

        if (dailyCount >= maxSubmissions) {
          // await this.twitterService.replyToTweet(
          //   tweet.id,
          //   "You've reached your daily submission limit. Please try again tomorrow.",
          // );
          logger.error(`${tweet.id}: User ${userId} has reached limit.`);
          return;
        }

        // curation
        const curatorNotes = this.extractDescription(
          originalTweet.username!,
          tweet,
        );
        submission = {
          userId: originalTweet.userId!, // user id
          tweetId: originalTweet.id!, // ref id

          // item data
          content: originalTweet.text || "",
          username: originalTweet.username!,
          createdAt: originalTweet.timeParsed || new Date(), // reply to post // vs as self post

          // curator data
          curatorId: userId, // tweetId, userId(curator)
          curatorUsername: curatorTweet.username,
          // relationship with the tweet
          curatorNotes,
          curatorTweetId: tweet.id!,
          submittedAt: new Date(),

          // admin data (update)
          moderationHistory: [], // moderatorId, userId, tweetId
        };
        await submissionRepository.saveSubmission(submission);
        await submissionRepository.incrementDailySubmissionCount(userId);
      }

      // Process each feed
      for (const feedId of feedIds) {
        const lowercaseFeedId = feedId.toLowerCase();
        const feed = this.config.feeds.find(
          (f: { id: string }) => f.id.toLowerCase() === lowercaseFeedId,
        );
        if (!feed) {
          logger.error(
            `${tweet.id}: Unable to find matching feed for ${feedId}`,
          );
          continue;
        }

        const isModerator = feed.moderation.approvers.twitter.some(
          (approver) =>
            approver.toLowerCase() === curatorTweet.username!.toLowerCase(),
        );
        const existingFeed = existingFeeds.find(
          (f) => f.feedId.toLowerCase() === lowercaseFeedId,
        );

        if (existingFeed) {
          // If feed already exists and is pending, check if new curator is moderator
          if (existingFeed.status === SubmissionStatus.PENDING && isModerator) {
            // Save moderation action first
            const moderation: Moderation = {
              adminId: curatorTweet.username!,
              action: "approve",
              timestamp: curatorTweet.timeParsed || new Date(),
              tweetId: originalTweet.id!,
              feedId: feed.id,
              note:
                this.extractDescription(originalTweet.username!, tweet) || null,
            };
            await submissionRepository.saveModerationAction(moderation);

            // Then update feed status
            await feedRepository.updateSubmissionFeedStatus(
              originalTweet.id!,
              feed.id,
              SubmissionStatus.APPROVED,
              tweet.id!,
            );

            if (feed.outputs.stream?.enabled) {
              await this.processorService.process(
                existingSubmission || submission!,
                feed.outputs.stream,
              );
            }
          }
        } else {
          if (feed) {
            await feedRepository.saveSubmissionToFeed(
              originalTweet.id!,
              feed.id,
              this.config.global.defaultStatus,
            );
          }

          // If moderator is submitting, process as an approval
          if (isModerator) {
            // Save moderation action first
            const moderation: Moderation = {
              adminId: curatorTweet.username!,
              action: "approve",
              timestamp: curatorTweet.timeParsed || new Date(),
              tweetId: originalTweet.id!,
              feedId: feed.id,
              note:
                this.extractDescription(originalTweet.username!, tweet) || null,
            };
            await submissionRepository.saveModerationAction(moderation);

            // Then update feed status
            await feedRepository.updateSubmissionFeedStatus(
              originalTweet.id!,
              feed.id,
              SubmissionStatus.APPROVED,
              tweet.id!,
            );

            if (feed.outputs.stream?.enabled) {
              await this.processorService.process(
                existingSubmission || submission!,
                feed.outputs.stream,
              );
            }
          }
        }
      }

      await this.handleAcknowledgement(tweet);

      logger.info(
        `${tweet.id}: Successfully processed submission for tweet ${originalTweet.id}`,
      );
    } catch (error) {
      logger.error(error, `${tweet.id}: Error while handling submission`);
    }
  }

  private async handleAcknowledgement(tweet: Tweet): Promise<void> {
    // Like the tweet
    await this.twitterService.likeTweet(tweet.id!);

    // // Reply to curator's tweet confirming submission
    // await this.twitterService.replyToTweet(
    //   tweet.id,
    //   "Successfully submitted!"
    // );
  }

  private async handleModeration(tweet: Tweet): Promise<void> {
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

    const submission =
      await submissionRepository.getSubmissionByCuratorTweetId(curatorTweetId);
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
      logger.error(
        `${tweet.id}: Could not find username for admin ID ${userId}`,
      );
      return;
    }

    // Get submission feeds to determine which feed is being moderated
    const pendingFeeds = submission
      .feeds!.filter((feed) => feed.status === SubmissionStatus.PENDING)
      .filter((feed) => {
        const feedConfig = this.config.feeds.find(
          (f: { id: string }) => f.id === feed.feedId,
        );
        return feedConfig?.moderation.approvers.twitter.some(
          (approver) => approver.toLowerCase() === adminUsername.toLowerCase(),
        );
      });

    if (pendingFeeds.length === 0) {
      logger.info(
        `${tweet.id}: No pending feeds found for submission that this moderator can moderate`,
      );
      return;
    }

    // Create moderation records for each feed this moderator can moderate
    for (const pendingFeed of pendingFeeds) {
      const moderation: Moderation = {
        adminId: adminUsername,
        action,
        timestamp: tweet.timeParsed || new Date(),
        tweetId: submission.tweetId,
        feedId: pendingFeed.feedId,
        note: this.extractNote(submission.username, tweet) || null,
      };

      // Save moderation action
      await submissionRepository.saveModerationAction(moderation);
    }

    // Process based on action
    if (action === "approve") {
      await this.processApproval(tweet, submission, pendingFeeds);
    } else {
      await this.processRejection(tweet, submission, pendingFeeds);
    }

    await this.handleAcknowledgement(tweet);
  }

  private async processApproval(
    tweet: Tweet,
    submission: Submission,
    pendingFeeds: SubmissionFeed[],
  ): Promise<void> {
    try {
      // Process each pending feed
      for (const pendingFeed of pendingFeeds) {
        const feed = this.config.feeds.find(
          (f: { id: string }) => f.id === pendingFeed.feedId,
        );
        if (!feed) continue;

        // Only update if not already moderated
        if (!pendingFeed.moderationResponseTweetId) {
          await feedRepository.updateSubmissionFeedStatus(
            submission.tweetId,
            pendingFeed.feedId,
            SubmissionStatus.APPROVED,
            tweet.id!,
          );

          if (feed.outputs.stream?.enabled) {
            await this.processorService.process(
              submission,
              feed.outputs.stream,
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        error,
        `${submission.tweetId}: Failed to process approved submission`,
      );
    }
  }

  private async processRejection(
    tweet: Tweet,
    submission: Submission,
    pendingFeeds: SubmissionFeed[],
  ): Promise<void> {
    try {
      // Process each pending feed
      for (const pendingFeed of pendingFeeds) {
        // Only update if not already moderated
        if (!pendingFeed.moderationResponseTweetId) {
          await feedRepository.updateSubmissionFeedStatus(
            submission.tweetId,
            pendingFeed.feedId,
            SubmissionStatus.REJECTED,
            tweet.id!,
          );
        }
      }
    } catch (error) {
      logger.error(
        `${submission.tweetId}: Failed to process rejected submission:`,
        error,
      );
    }
  }

  private isAdmin(userId: string): boolean {
    return this.adminIdCache.has(userId);
  }

  private getModerationAction(tweet: Tweet): "approve" | "reject" | null {
    const text = tweet.text?.toLowerCase() || "";
    if (text.includes("!approve")) return "approve";
    if (text.includes("!reject")) return "reject";
    return null;
  }

  private isModeration(tweet: Tweet): boolean {
    return this.getModerationAction(tweet) !== null;
  }

  private isSubmission(tweet: Tweet): boolean {
    return tweet.text?.toLowerCase().includes("!submit") || false;
  }

  private extractDescription(username: string, tweet: Tweet): string | null {
    const text = tweet.text
      ?.replace(/!submit\s+@\w+/i, "")
      .replace(new RegExp(`@${username}`, "i"), "")
      .replace(/#\w+/g, "")
      .trim();
    return text || null;
  }

  private extractNote(username: string, tweet: Tweet): string | null {
    const text = tweet.text
      ?.replace(/#\w+/g, "")
      .replace(new RegExp(`@${this.config.global.botId}`, "i"), "")
      .replace(new RegExp(`@${username}`, "i"), "")
      .trim();
    return text || null;
  }
}
