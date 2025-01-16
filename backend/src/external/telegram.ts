import { DistributorPlugin } from "../types/plugin";

export default class TelegramPlugin implements DistributorPlugin {
  name = "telegram";
  private botToken: string | null = null;
  private channelId: string | null = null;

  async initialize(feedId: string, config: Record<string, string>): Promise<void> {
    // Validate required config
    if (!config.botToken || !config.channelId) {
      throw new Error("Telegram plugin requires botToken and channelId");
    }

    this.botToken = config.botToken;
    this.channelId = config.channelId;

    try {
      // Validate credentials
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getChat?chat_id=${this.channelId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to validate Telegram credentials");
      }
    } catch (error) {
      console.error("Failed to initialize Telegram plugin:", error);
      throw error;
    }
  }

  async distribute(feedId: string, content: string): Promise<void> {
    if (!this.botToken || !this.channelId) {
      throw new Error("Telegram plugin not initialized");
    }

    const message = this.formatMessage(content);
    await this.sendMessage(message);
  }

  private formatMessage(content: string): string {
    // TODO
    return content;
  }

  private async sendMessage(text: string): Promise<void> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: this.channelId,
          text,
          parse_mode: "HTML",
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
    }
  }
}
