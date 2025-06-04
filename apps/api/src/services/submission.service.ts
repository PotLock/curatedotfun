import {
  DB,
  SelectSubmissionFeed,
  FeedRepository,
  InsertSubmission,
  InsertSubmissionFeed,
  RichSubmission,
  SelectFeed,
  SubmissionRepository,
  TwitterRepository,
  submissionStatusZodEnum,
  SubmissionStatus,
} from "@curatedotfun/shared-db";
import { Tweet } from "agent-twitter-client";
import { Logger } from "pino";
import { AppConfig } from "../types/config";
import { FeedService } from "./feed.service";
import { IBackgroundTaskService } from "./interfaces/background-task.interface";
import { ModerationService } from "./moderation.service";
import { TwitterService } from "./twitter/client";
export class SubmissionService implements IBackgroundTaskService {
  public readonly logger: Logger;
  private checkInterval: NodeJS.Timeout | null = null;
  private adminIdCache: Map<string, string> = new Map();

  constructor(
    private readonly twitterService: TwitterService,
    private readonly config: AppConfig,
    private readonly feedRepository: FeedRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly twitterRepository: TwitterRepository,
    private readonly db: DB,
    private readonly moderationService: ModerationService,
    private readonly feedService: FeedService,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  private async initializeAdminIds(): Promise<void> {
    try {
      const cachedAdminIds =
        await this.twitterRepository.getTwitterCacheValue("admin_ids");
      if (cachedAdminIds) {
        try {
          const adminMap = JSON.parse(cachedAdminIds);
          for (const [userId, handle] of Object.entries(adminMap)) {
            this.adminIdCache.set(userId, handle as string);
          }
          this.logger.info("Loaded admin IDs from cache");
          return;
        } catch (error) {
          this.logger.error("Failed to parse cached admin IDs:", error);
        }
      }

      const adminHandles = new Set<string>();
      const allFeeds = await this.feedService.getAllFeeds();
      for (const feed of allFeeds) {
        if (feed.config?.moderation?.approvers?.twitter) {
          for (const handle of feed.config.moderation.approvers.twitter) {
            adminHandles.add(handle);
          }
        }
      }

      this.logger.info("Fetching admin IDs for the first time...");
      const adminMap: Record<string, string> = {};

      for (const handle of adminHandles) {
        try {
          const userId =
            await this.twitterService.getUserIdByScreenName(handle);
          this.adminIdCache.set(userId, handle);
          adminMap[userId] = handle;
        } catch (error) {
          this.logger.error(
            `Failed to fetch ID for admin handle @${handle}:`,
            error,
          );
        }
      }

      await this.twitterRepository.setTwitterCacheValue(
        "admin_ids",
        JSON.stringify(adminMap),
      );
      this.logger.info("Cached admin IDs for future use");
    } catch (error) {
      this.logger.error("Failed to initialize admin IDs:", error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.initializeAdminIds();
    } catch (error) {
      this.logger.error("Failed to initialize submission service:", error);
      throw error;
    }
  }

  async start(): Promise<void> {
    await this.checkMentions();
    this.checkInterval = setInterval(async () => {
      await this.checkMentions();
    }, 60000);
  }

  private async checkMentions(): Promise<void> {
    try {
      this.logger.info("Checking mentions...");
      const newTweets = await this.twitterService.fetchAllNewMentions();

      if (newTweets.length === 0) {
        this.logger.info("No new mentions");
        return;
      }

      this.logger.info(`Found ${newTweets.length} new mentions`);

      for (const tweet of newTweets) {
        if (!tweet.id) continue;
        try {
          if (this.isSubmission(tweet)) {
            this.logger.info(`Received new submission: ${tweet.id}`);
            await this.handleSubmission(tweet);
          } else if (this.isModeration(tweet)) {
            this.logger.info(`Received new moderation: ${tweet.id}`);
            await this.handleModeration(tweet);
          }
        } catch (error) {
          this.logger.error(
            { error, tweetId: tweet.id },
            "Error processing tweet",
          );
        }
      }
    } catch (error) {
      this.logger.error({ error }, "Error checking mentions");
    }
  }

  async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async handleSubmission(tweet: Tweet): Promise<void> {
    const curatorUserId = tweet.userId;
    if (!curatorUserId || !tweet.id) return;

    const inReplyToId = tweet.inReplyToStatusId;
    if (!inReplyToId) {
      this.logger.error(
        { tweetId: tweet.id },
        "Submission is not a reply to another tweet",
      );
      return;
    }

    try {
      const curatorTweet = await this.twitterService.getTweet(tweet.id!);
      if (!curatorTweet || !curatorTweet.username) {
        this.logger.error(
          { tweetId: tweet.id },
          "Could not fetch curator tweet details",
        );
        return;
      }

      if (
        curatorTweet.username.toLowerCase() ===
          this.config.global.botId.toLowerCase() ||
        (this.config.global.blacklist?.["twitter"] || []).some(
          (blacklisted: string) =>
            blacklisted.toLowerCase() === curatorTweet.username?.toLowerCase(),
        )
      ) {
        this.logger.error(
          { tweetId: tweet.id, username: curatorTweet.username },
          "Submitted by bot or blacklisted user",
        );
        return;
      }

      const feedIdsFromHashtags = (tweet.hashtags || []).map((h) =>
        h.toLowerCase(),
      );
      if (
        feedIdsFromHashtags.length === 0 &&
        !tweet.text?.toLowerCase().includes("#all")
      ) {
        feedIdsFromHashtags.push("all");
      } else if (
        tweet.text?.toLowerCase().includes("#all") &&
        !feedIdsFromHashtags.includes("all")
      ) {
        feedIdsFromHashtags.push("all");
      }

      const originalTweet = await this.twitterService.getTweet(inReplyToId);
      if (
        !originalTweet ||
        !originalTweet.id ||
        !originalTweet.userId ||
        !originalTweet.username
      ) {
        this.logger.error(
          { tweetId: tweet.id, originalTweetId: inReplyToId },
          "Could not fetch complete original tweet details",
        );
        return;
      }

      let activeSubmission: RichSubmission | null =
        await this.submissionRepository.getSubmission(originalTweet.id);

      if (!activeSubmission) {
        const dailyCount =
          await this.submissionRepository.getDailySubmissionCount(
            curatorUserId,
          );
        const maxSubmissions = this.config.global.maxDailySubmissionsPerUser;
        if (dailyCount >= maxSubmissions) {
          this.logger.error(
            { tweetId: tweet.id, userId: curatorUserId },
            "User has reached daily submission limit.",
          );
          return;
        }

        const curatorNotes = this.extractDescription(
          originalTweet.username,
          tweet,
        );

        const newSubmissionData: InsertSubmission = {
          userId: originalTweet.userId,
          tweetId: originalTweet.id,
          content: originalTweet.text || "",
          username: originalTweet.username,
          createdAt: originalTweet.timeParsed || new Date(),
          curatorId: curatorUserId,
          curatorUsername: curatorTweet.username!,
          curatorNotes,
          curatorTweetId: tweet.id!,
          submittedAt: new Date(),
        };

        try {
          await this.db.transaction(async (tx) => {
            await this.submissionRepository.saveSubmission(
              newSubmissionData,
              tx,
            );
            await this.submissionRepository.incrementDailySubmissionCount(
              curatorUserId,
              tx,
            );
          });
          // Re-fetch the submission to get the full RichSubmission object with IDs and empty relations
          activeSubmission = await this.submissionRepository.getSubmission(
            originalTweet.id,
          );
          if (!activeSubmission) {
            this.logger.error(
              { tweetId: tweet.id, originalTweetId: originalTweet.id },
              "Failed to retrieve submission after creation.",
            );
            return;
          }
        } catch (submissionError) {
          this.logger.error(
            {
              error: submissionError,
              tweetId: tweet.id,
              originalTweetId: originalTweet.id,
            },
            "Error saving new submission or incrementing count.",
          );
          return;
        }
      }

      for (const feedId of [...new Set(feedIdsFromHashtags)]) {
        const lowercaseFeedId = feedId.toLowerCase();
        const feedFromService: SelectFeed | null =
          await this.feedService.getFeedById(lowercaseFeedId);

        if (!feedFromService || !feedFromService.config) {
          this.logger.warn(
            { tweetId: tweet.id, feedIdAttempt: lowercaseFeedId },
            "Feed or feed config not found",
          );
          continue;
        }
        const feedConfig = feedFromService.config;

        if (!feedConfig.moderation?.approvers?.twitter) {
          this.logger.warn(
            { tweetId: tweet.id, feedId: feedConfig.id },
            "Moderation approvers not configured for feed",
          );
          continue;
        }

        const isModerator = feedConfig.moderation.approvers.twitter.some(
          (approver: string) =>
            approver.toLowerCase() === curatorTweet.username!.toLowerCase(),
        );

        let submissionFeedEntryDb: SelectSubmissionFeed | undefined =
          activeSubmission.feeds.find(
            (sf) => sf.feedId.toLowerCase() === lowercaseFeedId,
          );

        try {
          await this.db.transaction(async (tx) => {
            if (!submissionFeedEntryDb) {
              const newSfEntryData: InsertSubmissionFeed = {
                submissionId: activeSubmission!.tweetId,
                feedId: feedConfig.id,
                status: submissionStatusZodEnum.Enum.pending,
              };

              const createdSubmissionFeed =
                await this.feedRepository.saveSubmissionToFeed(
                  newSfEntryData,
                  tx,
                );
              submissionFeedEntryDb = createdSubmissionFeed;

              // Re-fetch activeSubmission to ensure its 'feeds' array and other properties are fresh
              // for the auto-approval call or any other subsequent operations.
              const updatedSubmission =
                await this.submissionRepository.getSubmission(
                  activeSubmission!.tweetId,
                );
              if (updatedSubmission) {
                activeSubmission = updatedSubmission;
              } else {
                this.logger.error(
                  { tweetId: activeSubmission!.tweetId },
                  "Failed to re-fetch active submission after saving to feed. Auto-approval will use the version of activeSubmission from before this feed entry was saved, but with the correct new submissionFeedEntryDb.",
                );
              }
            }

            if (
              isModerator &&
              submissionFeedEntryDb &&
              submissionFeedEntryDb.status ===
                submissionStatusZodEnum.Enum.pending
            ) {
              if (activeSubmission && submissionFeedEntryDb) {
                await this.moderationService.processApprovalDecision(
                  activeSubmission,
                  submissionFeedEntryDb,
                  curatorTweet.username!,
                  tweet.id!,
                  this.extractDescription(originalTweet.username!, tweet) ||
                    null,
                  curatorTweet.timeParsed || new Date(),
                );
              } else {
                this.logger.warn(
                  {
                    tweetId: tweet.id,
                    submissionId: activeSubmission?.tweetId,
                    feedId: lowercaseFeedId,
                  },
                  "Could not find submission or pending feed entry for auto-approval after potential creation/update.",
                );
              }
            }
          });
        } catch (feedProcessingError) {
          this.logger.error(
            {
              error: feedProcessingError,
              tweetId: tweet.id,
              feedId: lowercaseFeedId,
            },
            "Error processing feed for submission",
          );
          // Continue to next feed if one fails
        }
      }
      await this.handleAcknowledgement(tweet);
      this.logger.info(
        { tweetId: tweet.id, originalTweetId: originalTweet.id },
        "Successfully processed submission",
      );
    } catch (error) {
      this.logger.error(
        { error, tweetId: tweet.id },
        "Error while handling submission",
      );
    }
  }

  private async handleAcknowledgement(tweet: Tweet): Promise<void> {
    await this.twitterService.likeTweet(tweet.id!);
  }

  private async handleModeration(tweet: Tweet): Promise<void> {
    const adminPlatformUserId = tweet.userId;
    if (!adminPlatformUserId || !tweet.id) {
      this.logger.error(
        { tweetId: tweet.id, userId: adminPlatformUserId },
        "Moderator user ID or tweet ID is invalid.",
      );
      return;
    }
    try {
      if (!this.isAdmin(adminPlatformUserId)) {
        this.logger.error(
          { tweetId: tweet.id, userId: adminPlatformUserId },
          "User is not an admin.",
        );
        return;
      }

      const curatorTweetId = tweet.inReplyToStatusId;
      if (!curatorTweetId) {
        this.logger.error(
          { tweetId: tweet.id },
          "Moderation tweet is not a reply.",
        );
        return;
      }

      const submissionDb =
        await this.submissionRepository.getSubmissionByCuratorTweetId(
          curatorTweetId,
        );
      if (!submissionDb) {
        this.logger.error(
          { tweetId: tweet.id, curatorTweetId },
          "Received moderation for an unsaved or unknown submission.",
        );
        return;
      }
      if (!submissionDb) {
        this.logger.error(
          { tweetId: tweet.id, curatorTweetId },
          "Submission not found for moderation via curator tweet ID.",
        );
        return;
      }

      const action = this.getModerationAction(tweet);
      if (!action) {
        this.logger.warn(
          { tweetId: tweet.id },
          "No valid moderation action determined from tweet text.",
        );
        return;
      }

      const adminUsername = this.adminIdCache.get(adminPlatformUserId);
      if (!adminUsername) {
        this.logger.error(
          { tweetId: tweet.id, userId: adminPlatformUserId },
          "Could not find username for admin ID.",
        );
        return;
      }

      const noteForModeration =
        this.extractNote(submissionDb.username, tweet) || null;

      const feedsToModerate: SelectSubmissionFeed[] = [];
      for (const sf of submissionDb.feeds) {
        if (sf.status === submissionStatusZodEnum.Enum.pending) {
          const feedFromService = await this.feedService.getFeedById(sf.feedId);
          if (
            feedFromService?.config?.moderation?.approvers?.twitter?.some(
              (approver: string) =>
                approver.toLowerCase() === adminUsername.toLowerCase(),
            )
          ) {
            feedsToModerate.push(sf);
          }
        }
      }

      if (feedsToModerate.length === 0) {
        this.logger.info(
          { tweetId: tweet.id, submissionId: submissionDb.tweetId },
          "No pending feeds found for this submission that this admin can moderate.",
        );
        return;
      }

      for (const feedEntry of feedsToModerate) {
        if (feedEntry.moderationResponseTweetId === tweet.id!) {
          this.logger.info(
            {
              tweetId: tweet.id,
              submissionId: submissionDb.tweetId,
              feedId: feedEntry.feedId,
            },
            "This feed entry was already moderated by this exact tweet.",
          );
          continue;
        }
        if (feedEntry.status !== submissionStatusZodEnum.Enum.pending) {
          this.logger.info(
            {
              tweetId: tweet.id,
              submissionId: submissionDb.tweetId,
              feedId: feedEntry.feedId,
              currentStatus: feedEntry.status,
            },
            "This feed entry is no longer pending.",
          );
          continue;
        }

        if (action === "approve") {
          await this.moderationService.processApprovalDecision(
            submissionDb,
            feedEntry,
            adminUsername,
            tweet.id!,
            noteForModeration,
            tweet.timeParsed || new Date(),
          );
        } else {
          // action === "reject"
          await this.moderationService.processRejectionDecision(
            submissionDb,
            feedEntry,
            adminUsername,
            tweet.id!,
            noteForModeration,
            tweet.timeParsed || new Date(),
          );
        }
      }

      await this.handleAcknowledgement(tweet);
      this.logger.info(
        { tweetId: tweet.id, submissionId: submissionDb.tweetId, action },
        "Successfully processed moderation.",
      );
    } catch (error) {
      // Closing the try-catch for handleModeration
      this.logger.error(
        { error, tweetId: tweet.id },
        "Error while handling moderation",
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
      .replace(/!approve|!reject/gi, "")
      .trim();
    return text || null;
  }
}
