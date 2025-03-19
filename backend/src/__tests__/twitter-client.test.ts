import { Tweet } from "agent-twitter-client";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { TwitterService } from "../services/twitter/client";
import { MockScraper } from "./mocks/scraper.mock";
import { mockDb, resetMockDb } from "./setup-test-env";

describe("TwitterService", () => {
  let twitterService: TwitterService;
  let mockScraper: MockScraper;

  const mockConfig = {
    username: "testuser",
    password: "testpass",
    email: "test@example.com",
  };

  beforeEach(async () => {
    // Reset all mocks
    resetMockDb();

    // Create fresh instances
    twitterService = new TwitterService(mockConfig);
    mockScraper = new MockScraper();
    (twitterService as any).client = mockScraper;

    // Initialize service
    await twitterService.initialize();
  });

  afterEach(async () => {
    await twitterService.stop();
  });

  describe("initialization", () => {
    it("should perform fresh login when no cached cookies exist", async () => {
      // Reset service to test initialization
      twitterService = new TwitterService(mockConfig);
      mockScraper = new MockScraper();
      (twitterService as any).client = mockScraper;

      // Mock no cached cookies
      mockDb.getTwitterCookies.mockReturnValue(null);
      mockDb.getTwitterCacheValue.mockReturnValue(null);

      await twitterService.initialize();

      // Verify login was successful
      expect(await mockScraper.isLoggedIn()).toBe(true);

      // Verify new cookies were cached
      expect(mockDb.setTwitterCookies).toHaveBeenCalledWith(
        mockConfig.username,
        expect.any(Array),
      );
    });

    it("should use cached cookies when available", async () => {
      // Reset service to test initialization
      twitterService = new TwitterService(mockConfig);
      mockScraper = new MockScraper();
      (twitterService as any).client = mockScraper;

      // Mock cached cookies and last tweet ID
      const mockCookies = [
        {
          name: "auth_token",
          value: "mock_token",
          domain: ".twitter.com",
          path: "/",
          secure: true,
          httpOnly: true,
        },
      ];
      mockDb.getTwitterCookies.mockReturnValue(mockCookies);
      mockDb.getTwitterCacheValue.mockReturnValue("last_tweet_123");

      // Spy on setCookies method
      const setCookiesSpy = mock.method(mockScraper, "setCookies");

      await twitterService.initialize();

      // Verify setCookies was called
      expect(setCookiesSpy).toHaveBeenCalled();

      // Verify login was successful using cached cookies
      expect(await mockScraper.isLoggedIn()).toBe(true);

      // Verify cookies were set from cache
      expect(mockDb.getTwitterCookies).toHaveBeenCalledWith(
        mockConfig.username,
      );
      // Should save cookies after verifying they work
      expect(mockDb.setTwitterCookies).toHaveBeenCalledWith(
        mockConfig.username,
        expect.any(Array),
      );
    });
  });

  describe("fetchAllNewMentions", () => {
    it("should fetch and sort new tweets when there are no previous tweets", async () => {
      const tweets: Tweet[] = [
        {
          id: "2",
          text: "Second tweet",
          username: "user2",
          userId: "user2_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "1",
          text: "First tweet",
          username: "user1",
          userId: "user1_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "3",
          text: "Third tweet",
          username: "user3",
          userId: "user3_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
      ];

      // Add tweets in random order to test sorting
      mockScraper.addMockTweet(tweets[0]); // id: 2
      mockScraper.addMockTweet(tweets[1]); // id: 1
      mockScraper.addMockTweet(tweets[2]); // id: 3

      const result = await twitterService.fetchAllNewMentions();

      // Should be sorted chronologically (oldest to newest)
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
      expect(result[2].id).toBe("3");
    });

    it("should handle large batch of tweets", async () => {
      // Create tweets up to the batch size (200)
      const tweets: Tweet[] = Array.from({ length: 150 }, (_, i) => ({
        id: String(i + 1),
        text: `Tweet ${i + 1}`,
        username: `user${i + 1}`,
        userId: `user${i + 1}_id`,
        timeParsed: new Date(),
        hashtags: [],
        mentions: [],
        photos: [],
        urls: [],
        videos: [],
        thread: [],
      }));

      // Add all tweets to mock
      tweets.forEach((tweet) => mockScraper.addMockTweet(tweet));

      const result = await twitterService.fetchAllNewMentions();

      // Should fetch all tweets in a single batch
      expect(result).toHaveLength(150);
      // Should be sorted chronologically (oldest to newest)
      expect(result[0].id).toBe("1");
      expect(result[149].id).toBe("150");
      // Should update last checked ID to newest tweet from original batch
      expect(twitterService.getLastCheckedTweetId()).toBe("150");
    });

    it("should only fetch tweets newer than last checked ID", async () => {
      // Set up initial state with last checked tweet
      await twitterService.setLastCheckedTweetId("2");

      const tweets: Tweet[] = [
        {
          id: "1",
          text: "Old tweet",
          username: "user1",
          userId: "user1_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "2",
          text: "Last checked tweet",
          username: "user2",
          userId: "user2_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "3",
          text: "New tweet",
          username: "user3",
          userId: "user3_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "4",
          text: "Newer tweet",
          username: "user4",
          userId: "user4_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
      ];

      tweets.forEach((tweet) => mockScraper.addMockTweet(tweet));

      const result = await twitterService.fetchAllNewMentions();

      // Should only include tweets newer than ID "2" (oldest to newest)
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("3");
      expect(result[1].id).toBe("4");

      // Should update last checked ID to newest tweet from original batch
      expect(twitterService.getLastCheckedTweetId()).toBe("4");
    });

    it("should handle empty results", async () => {
      // Reset service to test empty results
      twitterService = new TwitterService(mockConfig);
      mockScraper = new MockScraper();
      (twitterService as any).client = mockScraper;

      // Initialize with null last checked ID
      mockDb.getTwitterCacheValue.mockReturnValue(null);
      await twitterService.initialize();

      // Clear any tweets and fetch
      mockScraper.clearMockTweets();
      const result = await twitterService.fetchAllNewMentions();

      expect(result).toHaveLength(0);
      // Last checked ID should remain null
      expect(twitterService.getLastCheckedTweetId()).toBeNull();
    });

    it("should stop fetching when reaching old tweets", async () => {
      // Set up initial state with last checked tweet
      twitterService.setLastCheckedTweetId("3");

      const tweets: Tweet[] = [
        {
          id: "5",
          text: "Newest tweet",
          username: "user5",
          userId: "user5_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "4",
          text: "New tweet",
          username: "user4",
          userId: "user4_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "3",
          text: "Last checked tweet",
          username: "user3",
          userId: "user3_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "2",
          text: "Old tweet",
          username: "user2",
          userId: "user2_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "1",
          text: "Oldest tweet",
          username: "user1",
          userId: "user1_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
      ];

      tweets.forEach((tweet) => mockScraper.addMockTweet(tweet));

      const result = await twitterService.fetchAllNewMentions();

      // Should only include tweets newer than ID "3" (oldest to newest)
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("4");
      expect(result[1].id).toBe("5");
    });

    it("should reprocess tweets when last checked ID is set to an older one", async () => {
      // First process some tweets
      const tweets: Tweet[] = [
        {
          id: "5",
          text: "Newest tweet",
          username: "user5",
          userId: "user5_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "4",
          text: "New tweet",
          username: "user4",
          userId: "user4_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "3",
          text: "Middle tweet",
          username: "user3",
          userId: "user3_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "2",
          text: "Old tweet",
          username: "user2",
          userId: "user2_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
        {
          id: "1",
          text: "Oldest tweet",
          username: "user1",
          userId: "user1_id",
          timeParsed: new Date(),
          hashtags: [],
          mentions: [],
          photos: [],
          urls: [],
          videos: [],
          thread: [],
        },
      ];

      tweets.forEach((tweet) => mockScraper.addMockTweet(tweet));

      // First set last checked to tweet 4
      twitterService.setLastCheckedTweetId("4");

      // Initial fetch should only get tweet 5
      let result = await twitterService.fetchAllNewMentions();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("5");

      // Now set last checked to tweet 2
      twitterService.setLastCheckedTweetId("2");

      // Should now get tweets 3, 4, and 5 (oldest to newest)
      result = await twitterService.fetchAllNewMentions();
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("3");
      expect(result[1].id).toBe("4");
      expect(result[2].id).toBe("5");
    });
  });
});
