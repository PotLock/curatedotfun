import nock from "nock";
import { Tweet } from "agent-twitter-client";
import { createTestServer } from "./test-server";
import { createTestClient } from "./test-client";

/**
 * Sets up a test server and returns the server and API client
 * @returns An object containing the server and API client
 */
export async function setupTestServer() {
  const testServer = await createTestServer();
  const apiClient = createTestClient(testServer.port);

  return { server: testServer, apiClient };
}

/**
 * Cleans up after tests
 * @param server The server to close
 */
export async function cleanupTestServer(server: any) {
  await server.close();
  nock.cleanAll();
}

/**
 * Mocks the Twitter SearchTimeline API to return the specified tweets
 * @param tweets Array of tweets to include in the response
 * @returns The nock scope
 */
export function mockTwitterSearchTimeline(tweets: Tweet[]) {
  // Sort tweets by ID in descending order (newest first) to match Twitter's behavior
  const sortedTweets = [...tweets].sort((a, b) => {
    const aId = BigInt(a.id!);
    const bId = BigInt(b.id!);
    return bId > aId ? 1 : bId < aId ? -1 : 0;
  });

  // Create timeline entries for each tweet
  const entries = sortedTweets.map((tweet, index) => ({
    entryId: `tweet-${index + 1}`,
    content: {
      entryType: "TimelineTimelineItem",
      itemContent: {
        itemType: "TimelineTweet",
        tweet_results: {
          result: {
            rest_id: tweet.id,
            legacy: {
              created_at: (tweet.timeParsed || new Date()).toISOString(),
              full_text: tweet.text,
              in_reply_to_status_id_str: tweet.inReplyToStatusId,
              entities: {
                hashtags: (tweet.hashtags || []).map((tag) => {
                  return { text: String(tag) };
                }),
                user_mentions: (tweet.mentions || []).map((mention) => ({
                  screen_name:
                    typeof mention === "string" ? mention : mention.username,
                })),
              },
            },
            core: {
              user_results: {
                result: {
                  legacy: {
                    screen_name: tweet.username,
                  },
                  rest_id: tweet.userId,
                },
              },
            },
          },
        },
      },
    },
  }));

  // Create the mock response
  return nock("https://api.twitter.com")
    .get(/\/graphql\/.*\/SearchTimeline\?.*/)
    .reply(200, {
      data: {
        search_by_raw_query: {
          search_timeline: {
            timeline: {
              instructions: [
                {
                  type: "TimelineAddEntries",
                  entries,
                },
              ],
            },
          },
        },
      },
    });
}

/**
 * Waits for a specified amount of time
 * @param ms Time to wait in milliseconds
 * @returns A promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a random string for use in tests
 * @param length Length of the string to generate
 * @returns A random string
 */
export function randomString(length = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}
