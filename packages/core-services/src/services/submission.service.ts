import {
  DB,
  FeedRepository,
  InsertSubmission,
  InsertSubmissionFeed,
  RichSubmission,
  SelectFeed,
  SubmissionRepository,
  submissionStatusZodEnum,
} from "@curatedotfun/shared-db";
import { createQueue, QUEUE_NAMES } from "@curatedotfun/shared-queue";
import { Tweet } from "agent-twitter-client";
import { Logger } from "pino";
import { FeedService } from "./feed.service";
import { IBackgroundTaskService } from "./interfaces/background-task.interface";
import { ModerationService } from "./moderation.service";
import { ITwitterService } from "./twitter/twitter.interface";

export class SubmissionService implements IBackgroundTaskService {
  public readonly logger: Logger;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly twitterService: ITwitterService,
    private readonly feedRepository: FeedRepository,
    private readonly submissionRepository: SubmissionRepository,
    private readonly db: DB,
    private readonly feedService: FeedService,
    private readonly moderationService: ModerationService,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info("SubmissionService initialized.");
  }

  async start(): Promise<void> {
    await this.checkMentions();
    this.checkInterval = setInterval(async () => {
      await this.checkMentions();
    }, 60000); // Check every 60 seconds
  }

  async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.logger.info("SubmissionService stopped.");
  }

  public async getSubmission(tweetId: string): Promise<RichSubmission | null> {
    return this.submissionRepository.getSubmission(tweetId);
  }

  private async checkMentions(): Promise<void> {
    try {
      this.logger.info("Checking for new mentions...");
      const newTweets = await this.twitterService.fetchAllNewMentions();

      if (newTweets.length === 0) {
        this.logger.info("No new mentions found.");
        return;
      }

      this.logger.info(`Found ${newTweets.length} new mentions.`);

      for (const tweet of newTweets) {
        try {
          if (this.isSubmission(tweet)) {
            this.logger.info({ tweetId: tweet.id }, "Processing submission.");
            await this.handleSubmission(tweet);
          }
        } catch (error) {
          this.logger.error(
            { error, tweetId: tweet.id },
            "Error processing individual tweet in checkMentions loop.",
          );
        }
      }
    } catch (error) {
      this.logger.error({ error }, "Error during checkMentions execution.");
    }
  }

  private isSubmission(tweet: Tweet): boolean {
    return tweet.text?.toLowerCase().includes("!submit") || false;
  }

  private extractDescription(
    originalTweetUsername: string,
    curatorTweet: Tweet,
  ): string | null {
    const text = curatorTweet.text
      ?.replace(/!submit\s+@\w+/i, "")
      .replace(new RegExp(`@${originalTweetUsername}`, "i"), "") // Remove mention of the original author
      .replace(/#\w+/g, "") // Remove all hashtags
      .trim();
    return text || null;
  }

  private async extractAndValidateSubmissionDetails(
    curatorTweetCmd: Tweet,
  ): Promise<{
    curatorTweet: Tweet;
    originalTweet: Tweet;
    curatorUserId: string;
    curatorNotes: string | null;
    targetFeeds: SelectFeed[];
  } | null> {
    const curatorUserId = curatorTweetCmd.userId;
    if (!curatorUserId || !curatorTweetCmd.id) {
      this.logger.error(
        { tweetId: curatorTweetCmd.id, userId: curatorUserId },
        "Curator user ID or tweet ID is invalid.",
      );
      return null;
    }

    const inReplyToId = curatorTweetCmd.inReplyToStatusId;
    if (!inReplyToId) {
      this.logger.info(
        // Info, as it might be a standalone !submit tweet not replying
        { tweetId: curatorTweetCmd.id },
        "Submission command tweet is not a reply to another tweet. Cannot process as a submission.",
      );
      return null;
    }

    const curatorTweet = await this.twitterService.getTweet(curatorTweetCmd.id);
    if (!curatorTweet || !curatorTweet.username) {
      this.logger.error(
        { tweetId: curatorTweetCmd.id },
        "Could not fetch full curator tweet details.",
      );
      return null;
    }

    // Rule: Bot cannot submit content
    if (curatorTweet.username.toLowerCase() === "curatedotfun") {
      this.logger.info(
        { tweetId: curatorTweet.id, username: curatorTweet.username },
        "Submission attempt by the bot itself. Ignoring.",
      );
      return null;
    }

    const originalTweet = await this.twitterService.getTweet(inReplyToId);
    if (
      !originalTweet ||
      !originalTweet.id ||
      !originalTweet.userId ||
      !originalTweet.username
    ) {
      this.logger.error(
        {
          curatorTweetId: curatorTweet.id,
          originalTweetIdAttempt: inReplyToId,
        },
        "Could not fetch complete original tweet details.",
      );
      return null;
    }

    const curatorNotes = this.extractDescription(
      originalTweet.username,
      curatorTweet,
    );

    let feedSlugsFromHashtags = (curatorTweet.hashtags || []).map((h: string) =>
      h.toLowerCase(),
    );

    const includesAllHashtag = curatorTweet.text
      ?.toLowerCase()
      .includes("#all");

    if (feedSlugsFromHashtags.length === 0 && !includesAllHashtag) {
      feedSlugsFromHashtags.push("all"); // Default to 'all' if no hashtags and #all is not present
    } else if (includesAllHashtag && !feedSlugsFromHashtags.includes("all")) {
      feedSlugsFromHashtags.push("all"); // Add 'all' if #all is present but not in extracted hashtags
    }

    feedSlugsFromHashtags = [...new Set(feedSlugsFromHashtags)]; // Deduplicate

    if (feedSlugsFromHashtags.length === 0) {
      this.logger.warn(
        { curatorTweetId: curatorTweet.id },
        "No target feeds identified for submission (after defaulting logic). Skipping.",
      );
      return null;
    }

    // Fetch feed entities
    const targetFeeds: SelectFeed[] = [];
    for (const slug of feedSlugsFromHashtags) {
      const feed = await this.feedService.getFeedById(slug); // Assuming getFeedById can take slug
      if (feed) {
        targetFeeds.push(feed);
      } else {
        this.logger.warn(
          { curatorTweetId: curatorTweet.id, feedSlug: slug },
          "Referenced feed slug does not exist. It will be ignored for this submission.",
        );
      }
    }

    if (targetFeeds.length === 0) {
      this.logger.warn(
        {
          curatorTweetId: curatorTweet.id,
          attemptedSlugs: feedSlugsFromHashtags,
        },
        "No valid feeds found for submission after checking existence. Skipping.",
      );
      return null;
    }

    return {
      curatorTweet,
      originalTweet,
      curatorUserId,
      curatorNotes,
      targetFeeds,
    };
  }

  private async handleSubmission(curatorTweetCmd: Tweet): Promise<void> {
    const submissionDetails =
      await this.extractAndValidateSubmissionDetails(curatorTweetCmd);

    if (!submissionDetails) {
      this.logger.info(
        { tweetId: curatorTweetCmd.id },
        "Submission details invalid or incomplete. Aborting submission.",
      );
      return;
    }

    const {
      originalTweet,
      curatorTweet,
      curatorUserId,
      curatorNotes,
      targetFeeds,
    } = submissionDetails;

    try {
      await this.db.transaction(async (tx) => {
        let submission = await this.submissionRepository.getSubmission(
          originalTweet.id!,
        );

        if (!submission) {
          const newSubmissionData: InsertSubmission = {
            userId: originalTweet.userId!,
            tweetId: originalTweet.id!,
            content: originalTweet.text || "",
            username: originalTweet.username!,
            curatorId: curatorUserId,
            curatorUsername: curatorTweet.username!,
            curatorNotes,
            curatorTweetId: curatorTweet.id!,
            submittedAt: curatorTweet.timeParsed || new Date(),
          };
          await this.submissionRepository.saveSubmission(newSubmissionData, tx);
          submission = await this.submissionRepository.getSubmission(
            originalTweet.id!,
          );
          this.logger.info(
            {
              originalTweetId: originalTweet.id,
              curatorTweetId: curatorTweet.id,
            },
            "New submission successfully created.",
          );
          // await this.submissionRepository.incrementDailySubmissionCount(curatorUserId, tx);
        } else {
          this.logger.info(
            { originalTweetId: originalTweet.id },
            "Submission already exists. Proceeding to check feed associations.",
          );
        }

        for (const feed of targetFeeds) {
          // Check if the submission is already linked to this feed.
          const existingFeedLinks =
            await this.feedRepository.getFeedsBySubmission(originalTweet.id!);
          const existingFeedEntry = existingFeedLinks.find(
            (link) => link.feedId === feed.id,
          );

          if (!existingFeedEntry) {
            const newSfEntryData: InsertSubmissionFeed = {
              submissionId: originalTweet.id!,
              feedId: feed.id,
              status: submissionStatusZodEnum.Enum.pending,
            };
            await this.feedRepository.saveSubmissionToFeed(newSfEntryData, tx);
            this.logger.info(
              {
                submissionId: originalTweet.id,
                feedId: feed.id,
                status: "pending",
              },
              "Submission associated with new feed.",
            );

            // Attempt auto-approval
            if (submission && feed.config) {
              const moderationQueue = createQueue(QUEUE_NAMES.MODERATION);
              await moderationQueue.add(QUEUE_NAMES.MODERATION, {
                submissionId: submission.tweetId,
                feedId: feed.id,
                action: "approve",
                moderatorAccountId: curatorTweet.username!,
                moderatorAccountIdType: "platform_username",
                source: "auto_approval",
                note: submission.curatorNotes,
              });
              this.logger.info(
                {
                  submissionId: submission.tweetId,
                  feedId: feed.id,
                  curator: curatorTweet.username!,
                },
                "Enqueued auto-approval moderation task.",
              );
            } else {
              this.logger.error(
                {
                  submissionId: originalTweet.id!,
                  feedId: feed.id,
                },
                "Could not attempt auto-approval due to missing submission or feed config.",
              );
            }
          } else {
            this.logger.info(
              {
                submissionId: originalTweet.id,
                feedId: feed.id,
                status: existingFeedEntry.status,
              },
              "Submission already associated with this feed.",
            );
          }
        }
      }); // End of transaction

      await this.handleAcknowledgement(curatorTweetCmd);
      this.logger.info(
        {
          curatorTweetId: curatorTweetCmd.id,
          originalTweetId: originalTweet.id,
        },
        "Submission processed successfully (created or updated feed links).",
      );
    } catch (error) {
      this.logger.error(
        {
          error,
          curatorTweetId: curatorTweetCmd.id,
          originalTweetId: originalTweet.id,
        },
        "Error during submission transaction or acknowledgement.",
      );
    }
  }

  private async handleAcknowledgement(tweet: Tweet): Promise<void> {
    try {
      await this.twitterService.likeTweet(tweet.id!);
      this.logger.info(
        { tweetId: tweet.id },
        "Submission acknowledged with a like.",
      );
    } catch (error) {
      this.logger.error(
        { error, tweetId: tweet.id },
        "Failed to acknowledge submission with a like.",
      );
    }
  }
}
