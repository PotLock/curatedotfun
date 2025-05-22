import { SourceItem } from "@curatedotfun/types";
import { AppConfig, FeedConfig } from "../types/config.zod"; // For potential config access
import {
  AdaptedContentSubmission,
  AdaptedItem,
  AdaptedModerationCommand,
  AdaptedPendingSubmissionCommand,
  AdaptedUnknownItem,
  ModerationCommandData,
} from "../types/inbound.types";
import { Moderation, Submission } from "../types/submission";
import { logger } from "../utils/logger";

export class AdapterService {
  constructor(private appConfig: AppConfig) {}

  /**
   * Adapts a raw SourceItem into a structured AdaptedItem.
   * This is where platform-specific mapping to our internal models occurs.
   */
  public adaptItem(
    sourceItem: SourceItem,
    feedConfig: FeedConfig, // Feed context might be needed for adaptation rules
    searchId: string, // searchId that sourced this item
  ): AdaptedItem {
    const {
      id: sourceInternalId,
      externalId,
      content,
      createdAt,
      author,
      metadata,
    } = sourceItem;

    // Basic command detection (very rudimentary for now)
    // A more robust system would involve dedicated command source plugins or more sophisticated parsing.
    if (content.toLowerCase().includes("!submit")) {
      return this.tryAdaptAsSubmissionCommand(sourceItem, feedConfig, searchId);
    } else if (
      content.toLowerCase().includes("!approve") ||
      content.toLowerCase().includes("!reject")
    ) {
      return this.tryAdaptAsModerationCommand(sourceItem, feedConfig, searchId);
    }

    // Default to adapting as a content submission
    return this.tryAdaptAsContent(sourceItem, feedConfig, searchId);
  }

  private tryAdaptAsSubmissionCommand(
    sourceItem: SourceItem,
    feedConfig: FeedConfig,
    searchId: string,
  ): AdaptedItem {
    // This is a placeholder for !submit command logic.
    // A !submit command from a source like Twitter implies the 'sourceItem' is the curator's tweet,
    // and 'sourceItem.metadata.inReplyToId' is the actual content being submitted.
    // For now, we'll treat it like a direct content submission and the Inbound/Submission service
    // will need to handle the "curation" aspect.
    // A dedicated "TwitterCommandSource" plugin would be better for this.

    logger.info(
      `Adapting item ${sourceItem.externalId} as a potential submission command (treated as content).`,
    );
    // For a true !submit, we'd need to fetch the replied-to item.
    // Here, we'll assume the sourceItem *is* the content if inReplyToId is not present,
    // or if the plugin is expected to resolve this.

    if (sourceItem.metadata?.inReplyToId) {
      // This is a command replying to another item. Adapt as PendingSubmissionCommand.
      logger.info(
        `Adapting item ${sourceItem.externalId} as a PendingSubmissionCommand targeting ${sourceItem.metadata.inReplyToId}.`,
      );

      const curatorNotes = this.extractCuratorNotes(
        sourceItem.content,
        "!submit",
        sourceItem.author?.username || "replied_user",
      );

      // TODO: Extract potentialTargetFeedIds from hashtags in sourceItem.content if needed.
      // For now, leaving it undefined.
      // const potentialTargetFeedIds = extractHashtagsAsFeedIds(sourceItem.content);

      return {
        type: "pendingSubmissionCommand",
        originalSourceItem: sourceItem,
        sourcePluginName: sourceItem.metadata?.sourcePlugin || "unknown",
        feedId: feedConfig.id, // The feed context of the command itself
        searchId: searchId,
        targetExternalId: sourceItem.metadata.inReplyToId,
        curatorId: sourceItem.author?.id || "unknown_curator_id",
        curatorUsername:
          sourceItem.author?.username ||
          sourceItem.author?.displayName ||
          "unknown_curator",
        curatorPlatformId: sourceItem.author?.id, // Assuming platformId is same as id for now
        curatorActionExternalId: sourceItem.externalId, // The ID of the !submit command item
        curatorNotes: curatorNotes,
        submittedAt: sourceItem.createdAt
          ? new Date(sourceItem.createdAt)
          : new Date(),
        // potentialTargetFeedIds: [] // Placeholder
      } as AdaptedPendingSubmissionCommand;
    } else {
      // This is a direct !submit command, or a command where the item itself is the content.
      // Adapt as a direct ContentSubmission.
      logger.info(
        `Adapting item ${sourceItem.externalId} as a direct ContentSubmission (not a reply).`,
      );

      const submission: Partial<Submission> = {
        tweetId: sourceItem.externalId, // Using tweetId as it's the current field in Submission type
        userId: sourceItem.author?.id || "unknown_author_id",
        username:
          sourceItem.author?.username ||
          sourceItem.author?.displayName ||
          "unknown_author",
        content: sourceItem.content, // The content is the item itself
        createdAt: sourceItem.createdAt
          ? new Date(sourceItem.createdAt)
          : new Date(),
        submittedAt: new Date(), // When this adaptation/submission happens
        curatorId: sourceItem.author?.id || "unknown_curator_id", // The one who issued !submit is also the author here
        curatorUsername:
          sourceItem.author?.username ||
          sourceItem.author?.displayName ||
          "unknown_curator",
        curatorTweetId: sourceItem.externalId, // The !submit command tweet itself (or the content item)
        curatorNotes: this.extractCuratorNotes(
          sourceItem.content,
          "!submit",
          "",
        ), // No repliedToUsername if it's direct content
        media: sourceItem.media,
        status: this.appConfig.global.defaultStatus,
        moderationHistory: [],
        feeds: [], // SubmissionService will populate this
      };

      if (!submission.tweetId || !submission.content) {
        logger.warn(
          `Failed to adapt ${sourceItem.externalId} as direct content submission: missing essential fields.`,
        );
        return {
          type: "unknown",
          originalSourceItem: sourceItem,
          sourcePluginName: sourceItem.metadata?.sourcePlugin || "unknown",
          feedId: feedConfig.id,
          searchId: searchId,
          error: "Missing essential fields for direct content submission.",
        } as AdaptedUnknownItem;
      }

      return {
        type: "contentSubmission",
        originalSourceItem: sourceItem,
        sourcePluginName: sourceItem.metadata?.sourcePlugin || "unknown",
        feedId: feedConfig.id,
        searchId: searchId,
        submission: submission as Submission,
      } as AdaptedContentSubmission;
    }
  }

  private tryAdaptAsModerationCommand(
    sourceItem: SourceItem,
    feedConfig: FeedConfig,
    searchId: string,
  ): AdaptedItem {
    logger.info(
      `Adapting item ${sourceItem.externalId} as a moderation command.`,
    );
    const contentLower = sourceItem.content.toLowerCase();
    let action: Moderation["action"] | null = null;

    if (contentLower.includes("!approve")) action = "approve";
    else if (contentLower.includes("!reject")) action = "reject";

    if (!action || !sourceItem.metadata?.inReplyToId) {
      return {
        type: "unknown",
        originalSourceItem: sourceItem,
        sourcePluginName: sourceItem.metadata?.sourcePlugin || "unknown",
        feedId: feedConfig.id,
        searchId: searchId,
        error: "Invalid or incomplete moderation command.",
      } as AdaptedUnknownItem;
    }

    const commandData: ModerationCommandData = {
      targetExternalId: sourceItem.metadata.inReplyToId,
      action: action,
      moderatorUsername: sourceItem.author?.username || "unknown_moderator",
      moderatorPlatformId: sourceItem.author?.id,
      notes: this.extractCuratorNotes(sourceItem.content, action, ""), // Basic note extraction
      commandExternalId: sourceItem.externalId,
      commandTimestamp: sourceItem.createdAt
        ? new Date(sourceItem.createdAt)
        : new Date(),
    };

    return {
      type: "moderationCommand",
      originalSourceItem: sourceItem,
      sourcePluginName: sourceItem.metadata?.sourcePlugin || "unknown",
      feedId: feedConfig.id,
      searchId: searchId,
      command: commandData,
    } as AdaptedModerationCommand;
  }

  private tryAdaptAsContent(
    sourceItem: SourceItem,
    feedConfig: FeedConfig,
    searchId: string,
  ): AdaptedItem {
    logger.info(`Adapting item ${sourceItem.externalId} as direct content.`);
    // This path is for items that are not commands, but direct content from a source.
    // The concept of "curator" might be different here.
    // If the item is from a source like a news feed, the "author" is the content creator.
    // The "curator" fields in Submission might be null or refer to the system/bot.

    const submission: Partial<Submission> = {
      tweetId: sourceItem.externalId, // Using tweetId as it's the current field
      userId: sourceItem.author?.id || "source_author_id",
      username:
        sourceItem.author?.username ||
        sourceItem.author?.displayName ||
        "Source Author",
      content: sourceItem.content,
      createdAt: sourceItem.createdAt
        ? new Date(sourceItem.createdAt)
        : new Date(),
      submittedAt: new Date(), // Or could be item's createdAt if not "curated"
      // Curator fields might be system-generated or based on feed config
      curatorId: "system", // Placeholder
      curatorUsername: "system", // Placeholder
      curatorTweetId: sourceItem.id, // Using internal source item ID as a reference
      curatorNotes: undefined,
      media: sourceItem.media,
      status: this.appConfig.global.defaultStatus,
      moderationHistory: [],
      feeds: [],
    };

    if (!submission.tweetId || !submission.content) {
      logger.warn(
        `Failed to adapt ${sourceItem.externalId} as content: missing essential fields.`,
      );
      return {
        type: "unknown",
        originalSourceItem: sourceItem,
        sourcePluginName: sourceItem.metadata?.sourcePlugin || "unknown",
        feedId: feedConfig.id,
        searchId: searchId,
        error: "Missing essential fields for content.",
      } as AdaptedUnknownItem;
    }

    return {
      type: "contentSubmission",
      originalSourceItem: sourceItem,
      sourcePluginName: sourceItem.metadata?.sourcePlugin || "unknown",
      feedId: feedConfig.id,
      searchId: searchId,
      submission: submission as Submission,
    } as AdaptedContentSubmission;
  }

  // Basic note extraction, similar to old SubmissionService
  private extractCuratorNotes(
    text: string,
    command: string,
    repliedToUsername: string,
  ): string | null {
    const commandRegex = new RegExp(`!${command}\\s*(@\\w+\\s*)?`, "i");
    let notes = text
      .replace(commandRegex, "")
      .replace(new RegExp(`@${this.appConfig.global.botId}`, "i"), "") // Remove bot mention
      .replace(/#\w+/g, "") // Remove hashtags
      .trim();
    if (repliedToUsername) {
      // remove mention of the user being replied to if it's part of the notes
      notes = notes
        .replace(new RegExp(`@${repliedToUsername}`, "i"), "")
        .trim();
    }
    return notes || null;
  }
}
