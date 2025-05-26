import { Logger } from "pino";
import {
  AdaptedSourceItem,
  ContentItemIntent,
  DirectSubmissionIntent,
  InterpretedIntent,
  ModerationCommandData,
  ModerationCommandIntent,
  PendingSubmissionCommandIntent,
  UnknownIntent,
} from "../types/inbound.types";
import { logger } from "../utils/logger";
import { IBaseService } from "./interfaces/base-service.interface";
import { FeedConfig, SelectModerationHistory, Submission, submissionStatusZodEnum } from "@curatedotfun/types";

export class InterpretationService implements IBaseService {
  public readonly logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Interprets an AdaptedSourceItem to determine its intent (e.g., command, content).
   * @param adaptedSourceItem The item processed by AdapterService.
   * @param feedConfig The configuration of the feed this item belongs to.
   * @returns An InterpretedIntent object.
   */
  public interpretItem(
    adaptedSourceItem: AdaptedSourceItem,
    feedConfig: FeedConfig,
  ): InterpretedIntent {
    const { content, author, externalId, metadata, createdAt } =
      adaptedSourceItem;
    const contentLower = content.toLowerCase();

    // Command keywords - could be made more configurable later
    const SUBMIT_COMMAND = "!submit";
    const APPROVE_COMMAND = "!approve";
    const REJECT_COMMAND = "!reject";

    if (contentLower.includes(SUBMIT_COMMAND)) {
      return this.buildSubmissionIntent(
        adaptedSourceItem,
        feedConfig,
        SUBMIT_COMMAND,
      );
    } else if (
      contentLower.includes(APPROVE_COMMAND) ||
      contentLower.includes(REJECT_COMMAND)
    ) {
      const action = contentLower.includes(APPROVE_COMMAND)
        ? "approve"
        : "reject";
      return this.buildModerationIntent(
        adaptedSourceItem,
        feedConfig,
        action as SelectModerationHistory["action"],
        contentLower.includes(APPROVE_COMMAND)
          ? APPROVE_COMMAND
          : REJECT_COMMAND,
      );
    }

    // Default to interpreting as direct content
    return this.buildContentItemIntent(adaptedSourceItem, feedConfig);
  }

  private extractHashtagTexts(text: string): string[] {
    if (!text) return [];
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = text.matchAll(hashtagRegex);
    const hashtags: string[] = [];
    for (const match of matches) {
      hashtags.push(match[1]);
    }
    return hashtags;
  }

  private extractCuratorNotes(
    text: string,
    command: string, // e.g., "!submit", "!approve"
    repliedToUsername?: string, // Username of the user being replied to, if applicable
  ): string {
    let notes = text;

    // Remove the command itself (e.g., "!submit @user" or "!submit")
    // This regex looks for the command, optionally followed by a space and an @mention,
    // and any leading/trailing whitespace around this command block.
    const commandPattern = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape special regex characters in command
    const commandRegex = new RegExp(
      `^\\s*${commandPattern}(\\s+@\\w+)?\\s*`,
      "i",
    );
    notes = notes.replace(commandRegex, "");

    // If a repliedToUsername is provided (contextually, this would be the user being replied to in a thread,
    // not necessarily part of the command string itself but good to strip if it's the first thing in notes),
    // remove their mention if it appears at the beginning of the remaining notes.
    // This is a bit more targeted than a global replace of the repliedToUsername.
    if (repliedToUsername) {
      const repliedToMentionPattern = `@${repliedToUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
      const repliedToMentionRegex = new RegExp(
        `^\\s*${repliedToMentionPattern}\\b\\s*`,
        "i",
      );
      notes = notes.replace(repliedToMentionRegex, "");
    }

    // Remove all hashtags, as they are handled separately for feed targeting.
    notes = notes.replace(/#([a-zA-Z0-9_]+)/g, "").trim();

    return notes.trim();
  }

  private buildSubmissionIntent(
    adaptedSourceItem: AdaptedSourceItem,
    feedConfig: FeedConfig,
    command: string, // e.g. "!submit"
  ): InterpretedIntent {
    const {
      content,
      author,
      externalId,
      metadata,
      createdAt,
      originalSourceItem,
    } = adaptedSourceItem;

    if (metadata.inReplyToId) {
      // This is a !submit command replying to another item.
      logger.info(
        `InterpretationService: Interpreting ${externalId} as PendingSubmissionCommandIntent targeting ${metadata.inReplyToId}.`,
      );
      const curatorNotes = this.extractCuratorNotes(
        content,
        command,
        undefined, // repliedToUsername not directly applicable here for note extraction from command itself
      );
      const potentialTargetFeedNames = this.extractHashtagTexts(content);

      return {
        type: "pendingSubmissionCommandIntent",
        adaptedSourceItem,
        feedConfig,
        targetExternalId: metadata.inReplyToId,
        curatorId: author?.id || "unknown_curator_id",
        curatorUsername:
          author?.username || author?.displayName || "unknown_curator",
        curatorPlatformId: author?.id, // Assuming platformId is same as id for now
        curatorActionExternalId: externalId || originalSourceItem.id, // ID of the !submit command item
        curatorNotes: curatorNotes || undefined,
        submittedAt: createdAt,
        potentialTargetFeedNames:
          potentialTargetFeedNames.length > 0
            ? potentialTargetFeedNames
            : undefined,
      } as PendingSubmissionCommandIntent;
    } else {
      // This is a direct !submit command (item itself is the content).
      logger.info(
        `InterpretationService: Interpreting ${externalId} as DirectSubmissionIntent.`,
      );
      const curatorNotes = this.extractCuratorNotes(
        content,
        command,
        undefined,
      );

      const submissionData: Partial<Submission> = {
        tweetId: externalId || originalSourceItem.id,
        userId: author?.id || "unknown_author_id",
        username: author?.username || author?.displayName || "unknown_author",
        content: content, // The content is the item itself
        createdAt: createdAt,
        submittedAt: new Date(), // When this interpretation happens
        curatorId: author?.id || "unknown_curator_id",
        curatorUsername:
          author?.username || author?.displayName || "unknown_curator",
        curatorTweetId: externalId || originalSourceItem.id,
        curatorNotes: curatorNotes || undefined,
        media: adaptedSourceItem.media,
        status: submissionStatusZodEnum.Enum.pending,
        moderationHistory: [],
        feeds: [],
      };

      if (!submissionData.tweetId || !submissionData.content) {
        logger.warn(
          `InterpretationService: Failed to build DirectSubmissionIntent for ${externalId}: missing essential fields.`,
        );
        return {
          type: "unknownIntent",
          adaptedSourceItem,
          feedConfig,
          error: "Missing essential fields for direct submission intent.",
        } as UnknownIntent;
      }

      return {
        type: "directSubmissionIntent",
        adaptedSourceItem,
        feedConfig,
        submissionData,
      } as DirectSubmissionIntent;
    }
  }

  private buildModerationIntent(
    adaptedSourceItem: AdaptedSourceItem,
    feedConfig: FeedConfig,
    action: SelectModerationHistory["action"],
    command: string, // e.g. "!approve"
  ): InterpretedIntent {
    const {
      content,
      author,
      externalId,
      metadata,
      createdAt,
      originalSourceItem,
    } = adaptedSourceItem;

    logger.info(
      `InterpretationService: Interpreting ${externalId} as ModerationCommandIntent (Action: ${action}).`,
    );

    if (!metadata.inReplyToId) {
      logger.warn(
        `InterpretationService: Invalid moderation command ${externalId}. Missing inReplyToId.`,
      );
      return {
        type: "unknownIntent",
        adaptedSourceItem,
        feedConfig,
        error: "Invalid moderation command: missing target (inReplyToId).",
      } as UnknownIntent;
    }

    const notes = this.extractCuratorNotes(
      content,
      command,
      undefined, // repliedToUsername not directly applicable here
    );

    const commandData: ModerationCommandData = {
      targetExternalId: metadata.inReplyToId,
      action: action,
      moderatorUsername:
        author?.username || author?.displayName || "unknown_moderator",
      moderatorPlatformId: author?.id,
      notes: notes || undefined,
      commandExternalId: externalId || originalSourceItem.id,
      commandTimestamp: createdAt,
    };

    return {
      type: "moderationCommandIntent",
      adaptedSourceItem,
      feedConfig,
      commandData: commandData,
    } as ModerationCommandIntent;
  }

  private buildContentItemIntent(
    adaptedSourceItem: AdaptedSourceItem,
    feedConfig: FeedConfig,
  ): InterpretedIntent {
    const {
      content,
      author,
      externalId,
      createdAt,
      media,
      originalSourceItem,
    } = adaptedSourceItem;
    logger.info(
      `InterpretationService: Interpreting ${externalId} as ContentItemIntent.`,
    );

    const submissionData: Partial<Submission> = {
      tweetId: externalId || originalSourceItem.id,
      userId: author?.id || "source_author_id",
      username: author?.username || author?.displayName || "Source Author",
      content: content,
      createdAt: createdAt,
      submittedAt: new Date(), // Or could be item's createdAt if not "curated"
      curatorId: "system", // Placeholder, as this is direct content
      curatorUsername: "system", // Placeholder
      curatorTweetId: originalSourceItem.id, // Using internal source item ID as a reference
      curatorNotes: undefined,
      media: media,
      status: submissionStatusZodEnum.Enum.pending,
      moderationHistory: [],
      feeds: [],
    };

    if (!submissionData.tweetId || !submissionData.content) {
      logger.warn(
        `InterpretationService: Failed to build ContentItemIntent for ${externalId}: missing essential fields.`,
      );
      return {
        type: "unknownIntent",
        adaptedSourceItem,
        feedConfig,
        error: "Missing essential fields for content item intent.",
      } as UnknownIntent;
    }

    return {
      type: "contentItemIntent",
      adaptedSourceItem,
      feedConfig,
      submissionData,
    } as ContentItemIntent;
  }
}
