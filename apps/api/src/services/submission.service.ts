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

  private async validateAndPrepareSubmissionData(tweet: Tweet): Promise<{
    curatorTweet: Tweet;
    originalTweet: Tweet;
    curatorUserId: string;
    feedIds: string[];
  } | null> {
    const curatorUserId = tweet.userId;
    if (!curatorUserId || !tweet.id) {
      this.logger.error(
        { tweetId: tweet.id, userId: curatorUserId },
        "Curator user ID or tweet ID is invalid.",
      );
      return null;
    }

    const inReplyToId = tweet.inReplyToStatusId;
    if (!inReplyToId) {
      this.logger.error(
        { tweetId: tweet.id },
        "Submission is not a reply to another tweet.",
      );
      return null;
    }

    const curatorTweet = await this.twitterService.getTweet(tweet.id!);
    if (!curatorTweet || !curatorTweet.username) {
      this.logger.error(
        { tweetId: tweet.id },
        "Could not fetch curator tweet details.",
      );
      return null;
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
        "Submitted by bot or blacklisted user.",
      );
      return null;
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
        "Could not fetch complete original tweet details.",
      );
      return null;
    }

    return {
      curatorTweet,
      originalTweet,
      curatorUserId,
      feedIds: [...new Set(feedIdsFromHashtags)], // Ensure unique feed IDs
    };
  }

  private async createNewSubmission(
    originalTweet: Tweet,
    curatorTweet: Tweet,
    curatorUserId: string,
  ): Promise<RichSubmission | null> {
    const dailyCount =
      await this.submissionRepository.getDailySubmissionCount(curatorUserId);
    const maxSubmissions = this.config.global.maxDailySubmissionsPerUser;
    if (dailyCount >= maxSubmissions) {
      this.logger.error(
        { tweetId: curatorTweet.id, userId: curatorUserId },
        "User has reached daily submission limit.",
      );
      return null;
    }

    const curatorNotes = this.extractDescription(
      originalTweet.username!,
      curatorTweet,
    );

    const newSubmissionData: InsertSubmission = {
      userId: originalTweet.userId!,
      tweetId: originalTweet.id!,
      content: originalTweet.text || "",
      username: originalTweet.username!,
      createdAt: originalTweet.timeParsed || new Date(),
      curatorId: curatorUserId,
      curatorUsername: curatorTweet.username!,
      curatorNotes,
      curatorTweetId: curatorTweet.id!,
      submittedAt: new Date(),
    };

    try {
      await this.db.transaction(async (tx) => {
        await this.submissionRepository.saveSubmission(newSubmissionData, tx);
        await this.submissionRepository.incrementDailySubmissionCount(
          curatorUserId,
          tx,
        );
      });

      const createdSubmission = await this.submissionRepository.getSubmission(
        originalTweet.id!,
      );
      if (!createdSubmission) {
        this.logger.error(
          {
            tweetId: curatorTweet.id,
            originalTweetId: originalTweet.id!,
          },
          "Failed to retrieve submission after creation.",
        );
        return null;
      }
      return createdSubmission;
    } catch (submissionError) {
      this.logger.error(
        {
          error: submissionError,
          tweetId: curatorTweet.id,
          originalTweetId: originalTweet.id!,
        },
        "Error saving new submission or incrementing count.",
      );
      return null;
    }
  }

  private async handleAutoApprovalForFeed(
    activeSubmission: RichSubmission,
    submissionFeedEntryDb: SelectSubmissionFeed,
    curatorTweet: Tweet,
    originalTweetUsername: string,
    isModerator: boolean,
  ): Promise<void> {
    if (
      isModerator &&
      submissionFeedEntryDb.status === submissionStatusZodEnum.Enum.pending
    ) {
      await this.moderationService.processApprovalDecision(
        activeSubmission,
        submissionFeedEntryDb,
        curatorTweet.username!,
        curatorTweet.id!,
        this.extractDescription(originalTweetUsername, curatorTweet) || null,
        curatorTweet.timeParsed || new Date(),
      );
    } else if (
      isModerator &&
      submissionFeedEntryDb.status !== submissionStatusZodEnum.Enum.pending
    ) {
      this.logger.info(
        {
          tweetId: curatorTweet.id,
          submissionId: activeSubmission.tweetId,
          feedId: submissionFeedEntryDb.feedId,
          status: submissionFeedEntryDb.status,
        },
        "Auto-approval skipped: submission feed entry is not pending.",
      );
    }
  }

  private async processFeedSubmissions(
    activeSubmissionRef: { current: RichSubmission }, // Use a ref object to allow modification
    feedIds: string[],
    curatorTweet: Tweet,
    originalTweet: Tweet,
  ): Promise<void> {
    for (const feedId of feedIds) {
      const lowercaseFeedId = feedId.toLowerCase();
      const feedFromService: SelectFeed | null =
        await this.feedService.getFeedById(lowercaseFeedId);

      if (!feedFromService || !feedFromService.config) {
        this.logger.warn(
          { tweetId: curatorTweet.id, feedIdAttempt: lowercaseFeedId },
          "Feed or feed config not found while processing feed submissions.",
        );
        continue;
      }
      const feedConfig = feedFromService.config;

      if (!feedConfig.moderation?.approvers?.twitter) {
        this.logger.warn(
          { tweetId: curatorTweet.id, feedId: feedConfig.id },
          "Moderation approvers not configured for feed.",
        );
        continue;
      }

      const isModerator = feedConfig.moderation.approvers.twitter.some(
        (approver: string) =>
          approver.toLowerCase() === curatorTweet.username!.toLowerCase(),
      );

      let submissionFeedEntryDb: SelectSubmissionFeed | undefined =
        activeSubmissionRef.current.feeds.find(
          (sf) => sf.feedId.toLowerCase() === lowercaseFeedId,
        );

      try {
        await this.db.transaction(async (tx) => {
          if (!submissionFeedEntryDb) {
            const newSfEntryData: InsertSubmissionFeed = {
              submissionId: activeSubmissionRef.current.tweetId,
              feedId: feedConfig.id,
              status: submissionStatusZodEnum.Enum.pending,
            };

            const createdSubmissionFeed =
              await this.feedRepository.saveSubmissionToFeed(
                newSfEntryData,
                tx,
              );
            submissionFeedEntryDb = createdSubmissionFeed;

            // Re-fetch activeSubmission to update its 'feeds' array
            const updatedSubmission =
              await this.submissionRepository.getSubmission(
                activeSubmissionRef.current.tweetId,
              );
            if (updatedSubmission) {
              activeSubmissionRef.current = updatedSubmission; // Update the ref
            } else {
              this.logger.error(
                { tweetId: activeSubmissionRef.current.tweetId },
                "Failed to re-fetch active submission after saving to feed. Auto-approval will use stale data.",
              );
              // Continue with the potentially stale activeSubmissionRef.current but with the new submissionFeedEntryDb
            }
          }

          if (submissionFeedEntryDb) {
            // Ensure submissionFeedEntryDb is defined
            await this.handleAutoApprovalForFeed(
              activeSubmissionRef.current,
              submissionFeedEntryDb,
              curatorTweet,
              originalTweet.username!,
              isModerator,
            );
          } else {
            this.logger.warn(
              {
                tweetId: curatorTweet.id,
                submissionId: activeSubmissionRef.current.tweetId,
                feedId: lowercaseFeedId,
              },
              "Could not find or create submission feed entry for auto-approval.",
            );
          }
        });
      } catch (feedProcessingError) {
        this.logger.error(
          {
            error: feedProcessingError,
            tweetId: curatorTweet.id,
            feedId: lowercaseFeedId,
          },
          "Error processing feed for submission.",
        );
        // Continue to next feed if one fails
      }
    }
  }

  private async handleSubmission(tweet: Tweet): Promise<void> {
    try {
      const prepData = await this.validateAndPrepareSubmissionData(tweet);
      if (!prepData) return;
      const { curatorTweet, originalTweet, curatorUserId, feedIds } = prepData;

      let activeSubmission: RichSubmission | null =
        await this.submissionRepository.getSubmission(originalTweet.id!);

      if (!activeSubmission) {
        activeSubmission = await this.createNewSubmission(
          originalTweet,
          curatorTweet,
          curatorUserId,
        );
        if (!activeSubmission) {
          return; // Errors logged in createNewSubmission
        }
      }

      // Use a ref object for activeSubmission so processFeedSubmissions can update it
      const activeSubmissionRef = { current: activeSubmission };
      await this.processFeedSubmissions(
        activeSubmissionRef,
        feedIds,
        curatorTweet,
        originalTweet,
      );
      // activeSubmission is updated via activeSubmissionRef.current if re-fetched

      await this.handleAcknowledgement(tweet);
      this.logger.info(
        { tweetId: tweet.id, originalTweetId: originalTweet.id! },
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

  private async validateModerationTweet(
    tweet: Tweet,
  ): Promise<{ adminPlatformUserId: string; curatorTweetId: string } | null> {
    if (!tweet.userId || !tweet.id) {
      this.logger.error(
        { tweetId: tweet.id, userId: tweet.userId },
        "Moderator user ID or tweet ID is invalid.",
      );
      return null;
    }
    const curatorTweetId = tweet.inReplyToStatusId;
    if (!curatorTweetId) {
      this.logger.error(
        { tweetId: tweet.id },
        "Moderation tweet is not a reply.",
      );
      return null;
    }
    return { adminPlatformUserId: tweet.userId, curatorTweetId };
  }

  private async checkAdminPrivileges(
    adminPlatformUserId: string,
    tweetId: string,
  ): Promise<string | null> {
    if (!this.isAdmin(adminPlatformUserId)) {
      this.logger.error(
        { tweetId, userId: adminPlatformUserId },
        "User is not an admin.",
      );
      return null;
    }
    const adminUsername = this.adminIdCache.get(adminPlatformUserId);
    if (!adminUsername) {
      this.logger.error(
        { tweetId, userId: adminPlatformUserId },
        "Could not find username for admin ID.",
      );
      return null;
    }
    return adminUsername;
  }

  private async getModerationSubject(
    curatorTweetId: string,
    tweetId: string,
  ): Promise<RichSubmission | null> {
    const submissionDb =
      await this.submissionRepository.getSubmissionByCuratorTweetId(
        curatorTweetId,
      );
    if (!submissionDb) {
      this.logger.error(
        { tweetId, curatorTweetId },
        "Submission not found for moderation via curator tweet ID.",
      );
      return null;
    }
    return submissionDb;
  }

  private determineModerationActionAndNote(
    tweet: Tweet,
    submissionUsername: string,
  ): { action: "approve" | "reject" | null; note: string | null } {
    const action = this.getModerationAction(tweet);
    if (!action) {
      this.logger.warn(
        { tweetId: tweet.id },
        "No valid moderation action determined from tweet text.",
      );
    }
    const note = this.extractNote(submissionUsername, tweet) || null;
    return { action, note };
  }

  private async filterFeedsForModeration(
    submissionDb: RichSubmission,
    adminUsername: string,
    tweetId: string,
  ): Promise<SelectSubmissionFeed[]> {
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
        { tweetId, submissionId: submissionDb.tweetId },
        "No pending feeds found for this submission that this admin can moderate.",
      );
    }
    return feedsToModerate;
  }

  private async processModerationActionForFeed(
    feedEntry: SelectSubmissionFeed,
    submissionDb: RichSubmission,
    action: "approve" | "reject",
    adminUsername: string,
    moderationTweetId: string,
    note: string | null,
    moderationTime: Date,
  ): Promise<boolean> {
    if (feedEntry.moderationResponseTweetId === moderationTweetId) {
      this.logger.info(
        {
          tweetId: moderationTweetId,
          submissionId: submissionDb.tweetId,
          feedId: feedEntry.feedId,
        },
        "This feed entry was already moderated by this exact tweet.",
      );
      return false;
    }
    if (feedEntry.status !== submissionStatusZodEnum.Enum.pending) {
      this.logger.info(
        {
          tweetId: moderationTweetId,
          submissionId: submissionDb.tweetId,
          feedId: feedEntry.feedId,
          currentStatus: feedEntry.status,
        },
        "This feed entry is no longer pending.",
      );
      return false;
    }

    if (action === "approve") {
      await this.moderationService.processApprovalDecision(
        submissionDb,
        feedEntry,
        adminUsername,
        moderationTweetId,
        note,
        moderationTime,
      );
    } else {
      // action === "reject"
      await this.moderationService.processRejectionDecision(
        submissionDb,
        feedEntry,
        adminUsername,
        moderationTweetId,
        note,
        moderationTime,
      );
    }
    return true;
  }

  private async handleModeration(tweet: Tweet): Promise<void> {
    try {
      const validationResult = await this.validateModerationTweet(tweet);
      if (!validationResult) return;
      const { adminPlatformUserId, curatorTweetId } = validationResult;

      const adminUsername = await this.checkAdminPrivileges(
        adminPlatformUserId,
        tweet.id!,
      );
      if (!adminUsername) return;

      const submissionDb = await this.getModerationSubject(
        curatorTweetId,
        tweet.id!,
      );
      if (!submissionDb) return;

      const { action, note: noteForModeration } =
        this.determineModerationActionAndNote(tweet, submissionDb.username);
      if (!action) return;

      const feedsToModerate = await this.filterFeedsForModeration(
        submissionDb,
        adminUsername,
        tweet.id!,
      );
      // No early return if feedsToModerate is empty, to allow logging below if no action was taken.

      let actionTakenOnAnyFeed = false;
      for (const feedEntry of feedsToModerate) {
        const actionPerformed = await this.processModerationActionForFeed(
          feedEntry,
          submissionDb,
          action,
          adminUsername,
          tweet.id!,
          noteForModeration,
          tweet.timeParsed || new Date(),
        );
        if (actionPerformed) {
          actionTakenOnAnyFeed = true;
        }
      }

      if (actionTakenOnAnyFeed) {
        await this.handleAcknowledgement(tweet);
        this.logger.info(
          { tweetId: tweet.id, submissionId: submissionDb.tweetId, action },
          "Successfully processed moderation.",
        );
      } else {
        this.logger.info(
          {
            tweetId: tweet.id,
            submissionId: submissionDb.tweetId,
            action,
          },
          "Moderation command received, but no feeds were actionable (e.g., already moderated, not pending, or no eligible feeds).",
        );
      }
    } catch (error) {
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
