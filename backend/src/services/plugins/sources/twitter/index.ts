import { TwitterService } from "../../../twitter/client";
import { logger } from "../../../../utils/logger";
import { PluginEndpoint } from "services/plugins/plugin.service";

interface TwitterConfig extends Record<string, unknown> {
  username: string;
  password: string;
  email: string;
  twoFactorSecret?: string;
}

/**
 * Twitter source plugin that monitors Twitter for mentions and submissions
 */
export class TwitterSourcePlugin {
  name = "twitter-source";
  version = "0.0.1";
  type = "source" as const;
  private twitterService: TwitterService | null = null;
  private isMonitoring = false;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;

  async initialize(config: TwitterConfig): Promise<void> {
    this.twitterService = new TwitterService({
      username: config.username,
      password: config.password,
      email: config.email,
      twoFactorSecret: config.twoFactorSecret,
    });

    await this.twitterService.initialize();
  }

  async shutdown(): Promise<void> {
    if (this.twitterService) {
      await this.twitterService.stop();
      this.twitterService = null;
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  async startMonitoring(): Promise<void> {
    if (!this.twitterService) {
      throw new Error("Twitter service not initialized");
    }

    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    await this.checkMentions();

    // Check mentions every 5 minutes
    this.monitoringInterval = setInterval(
      () => {
        this.checkMentions().catch((error) => {
          logger.error("Error checking mentions:", error);
        });
      },
      5 * 60 * 1000,
    );
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  getLastProcessedId(): string | null {
    if (!this.twitterService) {
      throw new Error("Twitter service not initialized");
    }
    return this.twitterService.getLastCheckedTweetId();
  }

  async setLastProcessedId(id: string): Promise<void> {
    if (!this.twitterService) {
      throw new Error("Twitter service not initialized");
    }
    await this.twitterService.setLastCheckedTweetId(id);
  }

  private async checkMentions(): Promise<void> {
    if (!this.twitterService) {
      throw new Error("Twitter service not initialized");
    }
    // Implementation will be added when we refactor the submission service
  }

  getEndpoints(): PluginEndpoint[] {
    return [
      {
        path: "/last-tweet-id",
        method: "GET",
        handler: async () => {
          if (!this.twitterService) {
            throw new Error("Twitter service not available");
          }
          const lastTweetId = this.twitterService.getLastCheckedTweetId();
          return { lastTweetId };
        },
      },
      {
        path: "/last-tweet-id",
        method: "POST",
        handler: async ({ body }: { body: { tweetId: string } }) => {
          if (!this.twitterService) {
            throw new Error("Twitter service not available");
          }
          if (
            !body?.tweetId ||
            typeof body.tweetId !== "string" ||
            !body.tweetId.match(/^\d+$/)
          ) {
            throw new Error("Invalid tweetId format");
          }
          this.twitterService.setLastCheckedTweetId(body.tweetId);
          return { success: true };
        },
      },
    ];
  }
}

export default TwitterSourcePlugin;
