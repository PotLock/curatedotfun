import { SearchMode, Tweet } from "agent-twitter-client";
import { logger } from "@curatedotfun/utils";
import { ITwitterService } from "../services/twitter/twitter.interface";
import { TwitterCookie } from "../services/twitter/client";

export class MockTwitterService implements ITwitterService {
  private mockTweets: Tweet[] = [];
  private mockUserIds: Map<string, string> = new Map();
  private tweetIdCounter: bigint = BigInt(Date.now());
  private testLastCheckedTweetId: string | null = null;
  private client: any;

  constructor() {
    this.client = {
      isLoggedIn: async () => true,
      login: async () => {},
      logout: async () => {},
      getCookies: async () => [],
      setCookies: async () => {},
      fetchSearchTweets: async (
        query: string,
        count: number,
        mode: SearchMode,
      ) => {
        // Filter tweets that match the query (mentions @test_bot)
        const matchingTweets = this.mockTweets.filter((tweet) =>
          tweet.text?.includes("@curatedotfun"),
        );

        // Sort by ID descending (newest first) to match Twitter search behavior
        const sortedTweets = [...matchingTweets].sort((a, b) => {
          const aId = BigInt(a.id!);
          const bId = BigInt(b.id!);
          return bId > aId ? 1 : bId < aId ? -1 : 0;
        });

        return {
          tweets: sortedTweets.slice(0, count),
        };
      },
      likeTweet: async (tweetId: string) => {
        logger.info(`[MOCK]: Liked tweet ${tweetId}`);
        return true;
      },
      sendTweet: async (message: string, replyToId?: string) => {
        const newTweet = this.addMockTweet({
          text: message,
          username: "test_bot",
          inReplyToStatusId: replyToId,
        });
        return {
          json: async () => ({
            data: {
              create_tweet: {
                tweet_results: {
                  result: {
                    rest_id: newTweet.id,
                  },
                },
              },
            },
          }),
        } as Response;
      },
    };
  }

  private getNextTweetId(): string {
    this.tweetIdCounter = this.tweetIdCounter + BigInt(1);
    return this.tweetIdCounter.toString();
  }

  public addMockTweet(tweet: Partial<Tweet> & { inReplyToStatusId?: string }) {
    const fullTweet: Tweet = {
      id: tweet.id || this.getNextTweetId(),
      text: tweet.text || "",
      username: tweet.username || "test_user",
      userId: tweet.userId || `mock-user-id-${tweet.username || "test_user"}`,
      timeParsed: tweet.timeParsed || new Date(),
      hashtags: tweet.hashtags || [],
      mentions: tweet.mentions || [],
      photos: tweet.photos || [],
      urls: tweet.urls || [],
      videos: tweet.videos || [],
      thread: [],
      inReplyToStatusId: tweet.inReplyToStatusId,
    };
    this.mockTweets.push(fullTweet);
    logger.info(
      `[MOCK]: Added tweet "${fullTweet.text}" from @${fullTweet.username}${tweet.inReplyToStatusId ? ` as reply to ${tweet.inReplyToStatusId}` : ""}`,
    );
    return fullTweet;
  }

  public addMockUserId(username: string, userId: string) {
    this.mockUserIds.set(username, userId);
  }

  public clearMockTweets() {
    this.mockTweets = [];
    logger.info("[MOCK]: Cleared all tweets");
  }

  async initialize(): Promise<void> {
    logger.info("Mock Twitter service initialized");
  }

  async stop(): Promise<void> {
    logger.info("Mock Twitter service stopped");
  }

  async getUserIdByScreenName(screenName: string): Promise<string> {
    return this.mockUserIds.get(screenName) || `mock-user-id-${screenName}`;
  }

  async fetchAllNewMentions(): Promise<Tweet[]> {
    const BATCH_SIZE = 200;
    const lastCheckedId = this.testLastCheckedTweetId
      ? BigInt(this.testLastCheckedTweetId)
      : null;

    const allMentions = this.mockTweets.filter(
      (tweet) =>
        tweet.text?.includes("@test_bot") ||
        tweet.mentions?.some((m) => m.username === "test_bot"),
    );

    const newMentions = allMentions
      .filter((tweet) => {
        const tweetId = BigInt(tweet.id!);
        return !lastCheckedId || tweetId > lastCheckedId;
      })
      .sort((a, b) => {
        const aId = BigInt(a.id!);
        const bId = BigInt(b.id!);
        return aId > bId ? 1 : aId < bId ? -1 : 0;
      })
      .slice(0, BATCH_SIZE);

    if (newMentions.length === 0) {
      logger.info("No new mentions found");
      return [];
    }

    const latestTweet = newMentions[newMentions.length - 1];
    if (latestTweet?.id) {
      await this.setLastCheckedTweetId(latestTweet.id);
    }

    return newMentions;
  }

  async setLastCheckedTweetId(tweetId: string) {
    this.testLastCheckedTweetId = tweetId;
    logger.info(`Last checked tweet ID updated to: ${tweetId}`);
  }

  getLastCheckedTweetId(): string | null {
    return this.testLastCheckedTweetId;
  }

  async getTweet(tweetId: string): Promise<Tweet | null> {
    return this.mockTweets.find((t) => t.id === tweetId) || null;
  }

  async replyToTweet(tweetId: string, message: string): Promise<string | null> {
    const newTweet = this.addMockTweet({
      text: message,
      username: "test_bot",
      inReplyToStatusId: tweetId,
    });
    return newTweet.id ?? null;
  }

  async likeTweet(tweetId: string): Promise<void> {
    logger.info(`[MOCK]: Liked tweet ${tweetId}`);
  }

  async setCookies(cookies: TwitterCookie[]): Promise<boolean> {
    logger.info("[MOCK]: Set cookies", cookies);
    return true;
  }

  async getCookies(): Promise<TwitterCookie[] | null> {
    logger.info("[MOCK]: Get cookies");
    return [];
  }
}
