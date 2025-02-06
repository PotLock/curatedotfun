import { Client } from "@notionhq/client";
import { DistributorPlugin } from "types/plugin";
import { TwitterSubmission } from "types/twitter";

export default class NotionPlugin implements DistributorPlugin {
  name = "notion";
  private client: Client | null = null;
  private databaseId: string | null = null;

  async initialize(
    feedId: string,
    config: Record<string, string>,
  ): Promise<void> {
    // Validate required config
    if (!config.token) {
      throw new Error("Notion plugin requires token");
    }
    if (!config.databaseId) {
      throw new Error("Notion plugin requires databaseId");
    }

    this.client = new Client({ auth: config.token });
    this.databaseId = config.databaseId;

    try {
      // Validate credentials by attempting to query the database
      await this.client.databases.retrieve({
        database_id: this.databaseId,
      });
    } catch (error) {
      console.error("Failed to initialize Notion plugin:", error);
      throw new Error("Failed to validate Notion credentials");
    }
  }

  async distribute(
    feedId: string,
    submission: TwitterSubmission,
  ): Promise<void> {
    if (!this.client || !this.databaseId) {
      console.error("Notion plugin not initialized");
      return;
    }

    try {
      await this.createDatabaseRow(submission);
    } catch (error) {
      // Log the error but don't throw it to prevent application crash
      console.error("Failed to create Notion database row:", {
        error,
        feedId,
        submissionId: submission.tweetId,
      });

      // Log specific validation errors if available
      if (error instanceof Error && "body" in error) {
        try {
          const body = JSON.parse((error as any).body);
          console.error("Notion API validation error:", {
            message: body.message,
            code: body.code,
            requestId: body.request_id,
          });
        } catch (parseError) {
          console.error("Error parsing Notion API error body:", error);
        }
      }
    }
  }

  private async createDatabaseRow(
    submission: TwitterSubmission,
  ): Promise<void> {
    if (!this.client || !this.databaseId) {
      throw new Error("Notion plugin not initialized");
    }

    await this.client.pages.create({
      parent: {
        database_id: this.databaseId,
      },
      properties: {
        // Title property for tweetId (must be first property)
        tweetId: {
          title: [{ text: { content: submission.tweetId } }],
        },
        // Text properties
        userId: {
          rich_text: [{ text: { content: submission.userId } }],
        },
        username: {
          rich_text: [{ text: { content: submission.username } }],
        },
        curatorId: {
          rich_text: [{ text: { content: submission.curatorId } }],
        },
        curatorUsername: {
          rich_text: [{ text: { content: submission.curatorUsername } }],
        },
        content: {
          rich_text: [{ text: { content: submission.content.slice(0, 2000) } }],
        },
        curatorNotes: {
          rich_text: submission.curatorNotes
            ? [{ text: { content: submission.curatorNotes } }]
            : [],
        },
        curatorTweetId: {
          rich_text: [{ text: { content: submission.curatorTweetId } }],
        },
        // Date properties
        createdAt: {
          date: {
            start: new Date(submission.createdAt).toISOString(),
          },
        },
        submittedAt: {
          date: submission.submittedAt
            ? { start: new Date(submission.submittedAt).toISOString() }
            : null,
        },
        // Select property for status
        "status?": {
          select: {
            name: submission.status || "pending",
          },
        },
      },
    });
  }
}
