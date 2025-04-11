import { Scraper, SearchMode, Tweet } from "agent-twitter-client";
import { TwitterCookie } from "types/twitter";
import { logger } from "../../utils/logger";
import { twitterRepository } from "../db/repositories";

export class TwitterService {
  private client: Scraper;
  private lastCheckedTweetId: string | null = null;
  private twitterUsername: string;

  constructor(
    private readonly config: {
      username: string;
      password: string;
      email: string;
      twoFactorSecret?: string;
    },
  ) {
    this.client = new Scraper();
    this.twitterUsername = config.username;
  }

  private async loadCachedCookies(): Promise<boolean> {
    try {
      const cachedCookies = await this.getCookies();
      if (!cachedCookies) {
        return false;
      }

      // Convert cached cookies to the format expected by the client
      const cookieStrings = cachedCookies.map(
        (cookie) =>
          `${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${
            cookie.secure ? "Secure" : ""
          }; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${
            cookie.sameSite || "Lax"
          }`,
      );
      await this.client.setCookies(cookieStrings);

      // Verify the cookies are still valid
      return await this.client.isLoggedIn();
    } catch (error) {
      logger.error("Error loading cached cookies:", error);
      return false;
    }
  }

  private async performLogin(): Promise<boolean> {
    logger.info("Performing fresh Twitter login...");
    try {
      await this.client.login(
        this.config.username,
        this.config.password,
        this.config.email,
        this.config.twoFactorSecret,
      );

      if (await this.client.isLoggedIn()) {
        // Cache the new cookies
        const cookies = await this.client.getCookies();
        const formattedCookies: TwitterCookie[] = cookies.map((cookie) => ({
          name: cookie.key,
          value: cookie.value,
          domain: cookie.domain || ".twitter.com", // Provide default if null
          path: cookie.path || "/", // Provide default if null
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite as "Strict" | "Lax" | "None" | undefined,
        }));
        await twitterRepository.setTwitterCookies(
          this.config.username,
          formattedCookies,
        );
        logger.info("Successfully logged in to Twitter");
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Login attempt failed:", error);
      return false;
    }
  }

  async setCookies(cookies: TwitterCookie[]) {
    try {
      logger.info("Setting Twitter cookies...");
      // Convert cookies to the format expected by the client
      const cookieStrings = cookies.map(
        (cookie) =>
          `${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${
            cookie.secure ? "Secure" : ""
          }; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${
            cookie.sameSite || "Lax"
          }`,
      );
      await this.client.setCookies(cookieStrings);
      // Store cookies in database
      await twitterRepository.setTwitterCookies(this.config.username, cookies);
      // Verify the cookies work
      if (!(await this.client.isLoggedIn())) {
        throw new Error("Failed to verify cookies after setting");
      }
      return true;
    } catch (error) {
      logger.error("Failed to set Twitter cookies:", error);
      throw error;
    }
  }

  getCookies() {
    return twitterRepository.getTwitterCookies(this.twitterUsername);
  }

  async initialize() {
    // Validate required Twitter credentials
    if (
      !process.env.TWITTER_USERNAME ||
      !process.env.TWITTER_PASSWORD ||
      !process.env.TWITTER_EMAIL
    ) {
      throw new Error(
        "Missing required Twitter credentials. Please ensure TWITTER_USERNAME, TWITTER_PASSWORD, and TWITTER_EMAIL are set in your environment variables.",
      );
    }

    try {
      // First try to use cached cookies
      if (await this.loadCachedCookies()) {
        logger.info("Successfully initialized using cached cookies");
        this.lastCheckedTweetId =
          await twitterRepository.getTwitterCacheValue("last_tweet_id");
        return;
      }

      // If cached cookies failed or don't exist, try fresh login with retries
      for (let attempt = 0; attempt < 3; attempt++) {
        if (await this.performLogin()) {
          this.lastCheckedTweetId =
            await twitterRepository.getTwitterCacheValue("last_tweet_id");
          return;
        }

        if (attempt < 2) {
          logger.info(`Retrying login (attempt ${attempt + 1}/3)...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      throw new Error("Failed to initialize Twitter client after 3 attempts");
    } catch (error) {
      logger.error("Failed to initialize Twitter client:", error);
      throw error;
    }
  }

  async getUserIdByScreenName(screenName: string): Promise<string> {
    return await this.client.getUserIdByScreenName(screenName);
  }

  async getTweet(tweetId: string): Promise<Tweet | null> {
    return await this.client.getTweet(tweetId);
  }

  async replyToTweet(tweetId: string, message: string): Promise<string | null> {
    try {
      const response = await this.client.sendTweet(message, tweetId);
      const responseData = (await response.json()) as any;
      // Extract tweet ID from response
      const replyTweetId =
        responseData?.data?.create_tweet?.tweet_results?.result?.rest_id;
      return replyTweetId || null;
    } catch (error) {
      logger.error("Error replying to tweet:", error);
      return null;
    }
  }

  async likeTweet(tweetId: string): Promise<void> {
    try {
      await this.client.likeTweet(tweetId);
    } catch (error) {
      logger.error("Error liking tweet:", error);
    }
  }

  async fetchAllNewMentions(): Promise<Tweet[]> {
    const BATCH_SIZE = 200;
    let allNewTweets: Tweet[] = [];

    // Get the last tweet ID we processed
    const lastCheckedId = this.lastCheckedTweetId
      ? BigInt(this.lastCheckedTweetId)
      : null;

    try {
      const batch = (
        await this.client.fetchSearchTweets(
          `@${this.twitterUsername}`,
          BATCH_SIZE,
          SearchMode.Latest,
        )
      ).tweets;

      if (batch.length === 0) {
        logger.info("No tweets found");
        return [];
      }

      // Filter out tweets we've already processed
      for (const tweet of batch) {
        const tweetId = BigInt(tweet.id!);
        if (!lastCheckedId || tweetId > lastCheckedId) {
          allNewTweets.push(tweet);
        }
      }

      // Sort chronologically (oldest to newest)
      allNewTweets.sort((a, b) => {
        const aId = BigInt(a.id!);
        const bId = BigInt(b.id!);
        return aId > bId ? 1 : aId < bId ? -1 : 0;
      });

      // Only update last checked ID if we found new tweets
      if (allNewTweets.length > 0) {
        // Use the first tweet from the batch since it's the newest (batch comes in newest first)
        const highestId = batch[0].id;
        await this.setLastCheckedTweetId(highestId!);
      }

      return allNewTweets;
    } catch (error) {
      logger.error("Error fetching mentions:", error);
      return [];
    }
  }

  setLastCheckedTweetId(tweetId: string) {
    this.lastCheckedTweetId = tweetId;
    twitterRepository.setTwitterCacheValue("last_tweet_id", tweetId);
    logger.info(`Last checked tweet ID updated to: ${tweetId}`);
  }

  getLastCheckedTweetId(): string | null {
    return this.lastCheckedTweetId;
  }

  async stop() {
    await this.client.logout();
  }
}
