import { TwitterSubmission } from "types/twitter";
import { DistributorPlugin } from "../types/plugin";

export default class TelegramPlugin implements DistributorPlugin {
  name = "telegram";
  private botToken: string | null = null;
  private channelId: string | null = null;
  private messageThreadId: string | null = null;

  async initialize(
    feedId: string,
    config: Record<string, string>,
  ): Promise<void> {
    // Validate required config
    if (!config.botToken) {
      throw new Error("Telegram plugin requires botToken");
    }
    if (!config.channelId && !config.messageThreadId) {
      throw new Error(
        "Telegram plugin requires either channelId or messageThreadId",
      );
    }
    if (config.messageThreadId && !config.channelId) {
      throw new Error(
        "Telegram plugin requires channelId when messageThreadId is provided",
      );
    }

    this.botToken = config.botToken;
    this.channelId = config.channelId || null;
    this.messageThreadId = config.messageThreadId || null;

    try {
      // Validate credentials
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getChat?chat_id=${this.channelId || this.messageThreadId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to validate Telegram credentials");
      }
    } catch (error) {
      console.error("Failed to initialize Telegram plugin:", error);
      throw error;
    }
  }

  async distribute(
    feedId: string,
    submission: TwitterSubmission,
  ): Promise<void> {
    if (!this.botToken || (!this.channelId && !this.messageThreadId)) {
      throw new Error("Telegram plugin not initialized");
    }

    const message = this.formatMessage(submission.content);
    await this.sendMessage(message);
  }

  private formatMessage(content: string): string {
    // TODO
    return content;
  }

  private async sendMessage(text: string): Promise<void> {
    const messageData: Record<string, any> = {
      chat_id: this.channelId || this.messageThreadId,
      text,
      parse_mode: "HTML",
    };

    if (this.messageThreadId) {
      messageData.message_thread_id = this.messageThreadId;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      },
    );

    if (!response.ok) {
      const error = await response.json();
    }
  }
}
