import { Tweet } from "agent-twitter-client";
import { AppConfig } from "../../types/config";
import { Moderation, SubmissionFeed, SubmissionStatus, TwitterSubmission } from "../../types/twitter";
import { logger } from "../../utils/logger";
import { db } from "../db";
import { TwitterService } from "../twitter/client";
import { DistributionService } from "./../distribution/distribution.service";

export class SubmissionService {
  private checkInterval: NodeJS.Timer | null = null;
  private lastCheckedTweetId: string | null = null;
  private adminIdCache: Map<string, string> = new Map();

  constructor(
    private readonly twitterService: TwitterService,
    private readonly DistributionService: DistributionService,
    private readonly config: AppConfig,
  ) { }

  async initialize(): Promise<void> {
    // Initialize feeds and admin cache from config
    for (const feed of this.config.feeds) {
      // Ensure feed exists in database
      db.upsertFeed({
        id: feed.id,
        name: feed.name,
        description: feed.description,
      });

      // Cache admin IDs
      for (const handle of feed.moderation.approvers.twitter) {
        try {
          const userId =
            await this.twitterService.getUserIdByScreenName(handle);
          this.adminIdCache.set(userId, handle);
        } catch (error) {
          logger.error(
            `Failed to fetch ID for admin handle @${handle}:`,
            error,
          );
        }
      }
    }

    // Load last checked tweet ID
    this.lastCheckedTweetId = this.twitterService.getLastCheckedTweetId();
  }

  async startMentionsCheck(): Promise<void> {
    logger.info("Starting submission monitoring...");

    // Do an immediate check
    await this.checkMentions();

    // Then check mentions every minute
    this.checkInterval = setInterval(async () => {
      await this.checkMentions();
    }, 60000);
  }

  private async checkMentions(): Promise<void> {
    try {
      logger.info("Checking mentions...");
      const newTweets = await this.twitterService.fetchAllNewMentions(
        this.lastCheckedTweetId,
      );

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
            logger.info(`Received new submission: ${tweet.id}`);
            await this.handleSubmission(tweet);
          } else if (this.isModeration(tweet)) {
            logger.info(`Received new moderation: ${tweet.id}`);
            await this.handleModeration(tweet);
          }
        } catch (error) {
          logger.error("Error processing tweet:", error);
        }
      }

      // Update the last checked tweet ID
      const latestTweetId = newTweets[newTweets.length - 1].id;
      if (latestTweetId) {
        await this.setLastCheckedTweetId(latestTweetId);
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
    if (!userId || !tweet.id) return;

    const inReplyToId = tweet.inReplyToStatusId;
    if (!inReplyToId) {
      logger.error(
        `Submission ${tweet.id} is not a reply to another tweet`,
      );
      return;
    }

    try {
      // Extract feed IDs from hashtags
      const feedIds = (tweet.hashtags || []).filter((tag) =>
        this.config.feeds.some((feed) => feed.id === tag.toLowerCase()),
      );

      // If no feeds specified, reject submission
      if (feedIds.length === 0) {
        await this.twitterService.replyToTweet(
          tweet.id,
          "Please specify at least one valid feed using hashtags (e.g. #grants, #ethereum, #near)",
        );
        return;
      }

      // Fetch original tweet
      const originalTweet = await this.twitterService.getTweet(inReplyToId);
      if (!originalTweet) {
        logger.error(`Could not fetch original tweet ${inReplyToId}`);
        return;
      }

      // Fetch full curator tweet data to ensure we have the username
      const curatorTweet = await this.twitterService.getTweet(tweet.id!);
      if (!curatorTweet || !curatorTweet.username) {
        logger.error(`Could not fetch curator tweet details ${tweet.id}`);
        return;
      }

      // Check if this tweet was already submitted
      const existingSubmission = db.getSubmission(originalTweet.id!);
      const existingFeeds = existingSubmission
        ? (db.getFeedsBySubmission(existingSubmission.tweetId) as SubmissionFeed[])
        : [];

      // Create new submission if it doesn't exist
      let submission: TwitterSubmission | undefined;
      if (!existingSubmission) {
        const dailyCount = db.getDailySubmissionCount(userId);
        const maxSubmissions = this.config.global.maxSubmissionsPerUser;

        if (dailyCount >= maxSubmissions) {
          await this.twitterService.replyToTweet(
            tweet.id,
            "You've reached your daily submission limit. Please try again tomorrow.",
          );
          logger.info(`User ${userId} has reached limit, replied to submission.`);
          return;
        }

        submission = {
          tweetId: originalTweet.id!,
          userId: originalTweet.userId!,
          username: originalTweet.username!,
          curatorId: userId,
          curatorUsername: curatorTweet.username,
          content: originalTweet.text || "",
          curatorNotes: this.extractDescription(originalTweet.username!, tweet),
          curatorTweetId: tweet.id!,
          createdAt: originalTweet.timeParsed?.toISOString() || new Date().toISOString(),
          submittedAt: new Date().toISOString(),
          moderationHistory: []
        };
        db.saveSubmission(submission);
        db.incrementDailySubmissionCount(userId);
      }

      // Process each feed
      for (const feedId of feedIds) {
        const lowercaseFeedId = feedId.toLowerCase();
        const feed = this.config.feeds.find((f) => f.id === lowercaseFeedId);
        if (!feed) continue;

        const isModerator = feed.moderation.approvers.twitter.includes(curatorTweet.username!);
        const existingFeed = existingFeeds.find(f => f.feedId === lowercaseFeedId);

        if (existingFeed) {
          // If feed already exists and is pending, check if new curator is moderator
          if (existingFeed.status === SubmissionStatus.PENDING && isModerator) {
            // Save moderation action first
            const moderation: Moderation = {
              adminId: curatorTweet.username!,
              action: "approve",
              timestamp: curatorTweet.timeParsed || new Date(),
              tweetId: originalTweet.id!,
              feedId: lowercaseFeedId,
              note: this.extractDescription(originalTweet.username!, tweet),
            };
            db.saveModerationAction(moderation);

            // Then update feed status
            db.updateSubmissionFeedStatus(
              originalTweet.id!,
              lowercaseFeedId,
              SubmissionStatus.APPROVED,
              tweet.id!
            );

            if (feed.outputs.stream?.enabled) {
              await this.DistributionService.processStreamOutput(
                lowercaseFeedId,
                originalTweet.id!,
                originalTweet.text || ""
              );
            }
          }
        } else {
          // Add new feed with pending status initially
          db.saveSubmissionToFeed(originalTweet.id!, lowercaseFeedId, this.config.global.defaultStatus);

          // If moderator is submitting, process as an approval
          if (isModerator) {
            // Save moderation action first
            const moderation: Moderation = {
              adminId: curatorTweet.username!,
              action: "approve",
              timestamp: curatorTweet.timeParsed || new Date(),
              tweetId: originalTweet.id!,
              feedId: lowercaseFeedId,
              note: this.extractDescription(originalTweet.username!, tweet),
            };
            db.saveModerationAction(moderation);

            // Then update feed status
            db.updateSubmissionFeedStatus(
              originalTweet.id!,
              lowercaseFeedId,
              SubmissionStatus.APPROVED,
              tweet.id!
            );

            if (feed.outputs.stream?.enabled) {
              await this.DistributionService.processStreamOutput(
                lowercaseFeedId,
                originalTweet.id!,
                originalTweet.text || ""
              );
            }
          }
        }
      }

      logger.info(`Successfully processed submission for tweet ${originalTweet.id}`);
    } catch (error) {
      logger.error(`Error handling submission for tweet ${tweet.id}:`, error);
    }
  }

  private async handleModeration(tweet: Tweet): Promise<void> {
    const userId = tweet.userId;
    if (!userId || !tweet.id) {
      logger.info(`User ${userId} is not admin.`);
      return;
    }

    if (!this.isAdmin(userId)) {
      logger.info(`User ${userId} is not admin.`);
      return;
    }

    const inReplyToId = tweet.inReplyToStatusId;
    if (!inReplyToId) return;

    const submission = db.getSubmission(inReplyToId);
    if (!submission)
      return;

    const action = this.getModerationAction(tweet);
    if (!action) return;

    const adminUsername = this.adminIdCache.get(userId);
    if (!adminUsername) {
      logger.error(`Could not find username for admin ID ${userId}`);
      return;
    }

    // Get submission feeds to determine which feed is being moderated
    const submissionFeeds = db.getFeedsBySubmission(submission.tweetId) as SubmissionFeed[];
    const pendingFeeds = submissionFeeds
      .filter(feed => feed.status === SubmissionStatus.PENDING)
      .filter(feed => {
        const feedConfig = this.config.feeds.find(f => f.id === feed.feedId);
        return feedConfig?.moderation.approvers.twitter.includes(adminUsername);
      });

    if (pendingFeeds.length === 0) {
      logger.info("No pending feeds found for submission that this moderator can moderate");
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
        note: this.extractNote(submission.username, tweet),
      };

      // Save moderation action
      db.saveModerationAction(moderation);
    }

    // Process based on action
    if (action === "approve") {
      await this.processApproval(tweet, submission, pendingFeeds);
    } else {
      await this.processRejection(tweet, submission, pendingFeeds);
    }
  }

  private async processApproval(
    tweet: Tweet,
    submission: TwitterSubmission,
    pendingFeeds: SubmissionFeed[]
  ): Promise<void> {
    try {

      // Process each pending feed
      for (const pendingFeed of pendingFeeds) {
        const feed = this.config.feeds.find(f => f.id === pendingFeed.feedId);
        if (!feed) continue;

        // Only update if not already moderated
        if (!pendingFeed.moderationResponseTweetId) {
          db.updateSubmissionFeedStatus(
            submission.tweetId,
            pendingFeed.feedId,
            SubmissionStatus.APPROVED,
            tweet.id!
          );

          if (feed.outputs.stream?.enabled) {
            await this.DistributionService.processStreamOutput(
              pendingFeed.feedId,
              submission.tweetId,
              submission.content
            );
          }
        }
      }
    } catch (error) {
      logger.error("Failed to process approved submission:", error);
    }
  }

  private async processRejection(tweet: Tweet, submission: TwitterSubmission, pendingFeeds: SubmissionFeed[]): Promise<void> {
    try {
      // Process each pending feed
      for (const pendingFeed of pendingFeeds) {
        // Only update if not already moderated
        if (!pendingFeed.moderationResponseTweetId) {
          db.updateSubmissionFeedStatus(
            submission.tweetId,
            pendingFeed.feedId,
            SubmissionStatus.REJECTED,
            tweet.id!
          );
        }
      }
    } catch (error) {
      logger.error("Failed to process rejected submission:", error);
    }
  }

  private isAdmin(userId: string): boolean {
    return this.adminIdCache.has(userId);
  }

  private getModerationAction(tweet: Tweet): "approve" | "reject" | null {
    const hashtags = tweet.hashtags?.map((tag) => tag.toLowerCase()) || [];
    if (tweet.text?.includes("!approve") || hashtags.includes("approve"))
      return "approve";
    if (tweet.text?.includes("!reject") || hashtags.includes("reject"))
      return "reject";
    return null;
  }

  private isModeration(tweet: Tweet): boolean {
    return this.getModerationAction(tweet) !== null;
  }

  private isSubmission(tweet: Tweet): boolean {
    return tweet.text?.toLowerCase().includes("!submit") || false;
  }

  private extractDescription(
    username: string,
    tweet: Tweet,
  ): string | undefined {
    return (
      tweet.text
        ?.replace(/!submit\s+@\w+/i, "")
        .replace(new RegExp(`@${username}`, "i"), "")
        .replace(/#\w+/g, "")
        .trim() || undefined
    );
  }

  private extractNote(username: string, tweet: Tweet): string | undefined {
    return (
      tweet.text
        ?.replace(/#\w+/g, "")
        .replace(new RegExp(`@${this.config.global.botId}`, "i"), "")
        .replace(new RegExp(`@${username}`, "i"), "")
        .trim() || undefined
    );
  }

  private async setLastCheckedTweetId(tweetId: string) {
    this.lastCheckedTweetId = tweetId;
    await this.twitterService.setLastCheckedTweetId(tweetId);
  }
}
