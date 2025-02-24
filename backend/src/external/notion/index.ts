import { Client } from "@notionhq/client";
import { DistributorPlugin } from "types/plugin";
import { TwitterSubmission } from "types/twitter";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export default class NotionPlugin implements DistributorPlugin {
  name = "notion";
  private client: Client | null = null;
  private databaseId: string | null = null;
  private aiToken: string | null = null;

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
    if (config.aiToken) this.aiToken = config.aiToken;

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
      let title = `${submission.username}: ${submission.content.slice(0, 30)}...`;
      if (this.aiToken) {
        try {
          const messages: Message[] = [
            {
              role: "system",
              content:
                "Summarize the main idea of this tweet content and the associated curator's notes into a clear, engaging title. Keep it concise, between 30–50 characters, highlighting the key message without losing its impact. Respond with the title only—no extra text, explanations, or quotation marks.",
            },
            {
              role: "user",
              content: `CONTENT: ${submission.content}, NOTES: ${submission.curatorNotes}`,
            },
          ];

          const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.aiToken}`,
                "HTTP-Referer": "https://curate.fun",
                "X-Title": "CurateDotFun",
              },
              body: JSON.stringify({
                model: "openai/gpt-3.5-turbo", // Default to GPT-3.5-turbo for cost efficiency
                messages,
                temperature: 0.7,
                max_tokens: 1000,
              }),
            },
          );

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter API error: ${error}`);
          }

          const result = (await response.json()) as OpenRouterResponse;
          const aiTitle = result.choices?.[0]?.message?.content?.trim();

          // Validate AI response
          if (!aiTitle) {
            throw new Error("Invalid response from OpenRouter API");
          }

          // Validate title length (30-50 chars as per system prompt)
          if (aiTitle.length >= 30 && aiTitle.length <= 50) {
            title = aiTitle;
          } else {
            console.warn("AI-generated title length out of bounds:", {
              length: aiTitle.length,
              title: aiTitle,
            });
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          console.warn(
            "GPT title generation failed, using fallback title:",
            errorMessage,
          );
        }
      }
      await this.createDatabaseRow(title, submission);
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
    title: string,
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
          // Name
          title: [{ text: { content: title } }],
        },
        // Text properties
        userId: {
          // Link
          rich_text: [
            {
              text: {
                content: `https://x.com/${submission.username}/status/${submission.tweetId}`,
              },
            },
          ],
        },
        submittedAt: {
          // Date Added
          date: submission.submittedAt
            ? { start: new Date(submission.submittedAt).toISOString() }
            : null,
        },
      },
    });
  }
}
